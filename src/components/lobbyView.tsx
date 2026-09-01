import { last } from "lodash";
import Head from "next/head";
import Link from "next/link";
import React, { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowContainer, Popover } from "react-tiny-popover";
import Board from "~/components/board";
import FaceDownHand from "~/components/faceDownHand";
import HomeButton from "~/components/homeButton";
import LobbyChat from "~/components/lobbyChat";
import MenuArea from "~/components/menuArea";
import { POPOVER_ARROW_COLOR, POPOVER_CONTENT_STYLE } from "~/components/popoverAppearance";
import PlayerRow, { HandStrip } from "~/components/playerRow";
import ReactionsPopover from "~/components/reactionsPopover";
import Button from "~/components/ui/button";
import { Checkbox, Field, TextInput } from "~/components/ui/forms";
import Txt, { TxtSize } from "~/components/ui/txt";
import useLocalStorage from "~/hooks/localStorage";
import { useColorBlindMode } from "~/hooks/userPreferences";
import { useSession } from "~/hooks/session";
import {
  deckSize,
  handSizeForPlayerCount,
  joinLobby,
  MAX_PLAYERS,
  MaxHints,
  MIN_PLAYERS,
  removePlayerFromLobby,
  startGameFromLobby,
} from "~/lib/actions";
import { logEvent } from "~/lib/analytics";
import { logFailedPromise } from "~/lib/errors";
import { setPlayerReaction, updateGame } from "~/lib/firebase";
import { uniqueId } from "~/lib/id";
import IGameState, { GameMode, ILobbyState, IMinimalPlayer } from "~/lib/state";

function listPlayerNames(players: IMinimalPlayer[]) {
  const [firstPlayer] = players;
  if (!firstPlayer) {
    return null;
  }

  const lastPlayer = last(players);
  if (players.length === 1 || !lastPlayer) {
    return firstPlayer.name;
  }

  const firstNames = players
    .slice(0, -1)
    .map((player) => player.name)
    .join("& ");

  return `${firstNames} & ${lastPlayer.name}`;
}

function Meta(props: { players: IMinimalPlayer[] }) {
  const { t } = useTranslation();
  const inviters = props.players.filter((player) => !player.bot);

  const playersNames = listPlayerNames(inviters);

  const description = playersNames ? t("invitationByPlayers", { playersNames }) : t("invitationNoPlayers");

  return (
    <Head>
      <meta content={description} property="og:description" />
    </Head>
  );
}

interface Props {
  host: string;
  lobby: ILobbyState;
  onStateChange: (state: IGameState | ILobbyState) => void;
}

const NAME_KEY = "name";

export default function LobbyView(props: Props) {
  const { host, lobby, onStateChange } = props;
  const { t } = useTranslation();

  const { playerId } = useSession();
  const [, setGameId] = useLocalStorage<string | null>("gameId", null);
  const colorBlindMode = useColorBlindMode();
  const [name, setName] = useState("");
  const [bot, setBot] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const reactionTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const isNetwork = lobby.options.gameMode === GameMode.NETWORK;

  const selfPlayer = isNetwork ? lobby.players.find((player) => player.id === playerId) : last(lobby.players);

  const onReaction = useCallback(
    async (reaction: string | null) => {
      if (selfPlayer?.index === undefined) return;
      clearTimeout(reactionTimeoutRef.current);
      await setPlayerReaction(lobby.id, selfPlayer.index, reaction);
      if (reaction) {
        reactionTimeoutRef.current = setTimeout(() => {
          setPlayerReaction(lobby.id, selfPlayer.index as number, null).catch(logFailedPromise);
        }, 10_000);
      }
    },
    [lobby.id, selfPlayer?.index]
  );

  const gameFull = lobby.players.length === MAX_PLAYERS;
  const canJoin = (lobby.options.gameMode === GameMode.PASS_AND_PLAY || !selfPlayer) && !gameFull;
  const canStart = lobby.players.length >= MIN_PLAYERS;
  const lobbyHandSize = handSizeForPlayerCount(lobby.players.length);

  const shareLink = `${host}/${lobby.id}`;
  const inputRef = React.createRef<HTMLInputElement>();
  function copy() {
    inputRef.current?.select();
    document.execCommand("copy");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => {
    if (lobby.options.gameMode === GameMode.PASS_AND_PLAY && lobby.players.length > 0) {
      setName("");
    } else {
      setName(localStorage.getItem(NAME_KEY) || "");
    }
  }, [lobby.players.length, lobby.options.gameMode]);

  function onJoinGame(player: Omit<IMinimalPlayer, "id">) {
    if (!playerId) {
      return;
    }

    const nextLobby = joinLobby(lobby, { id: playerId, ...player });

    onStateChange({ ...nextLobby, synced: false });
    updateGame(nextLobby).catch(logFailedPromise);

    logEvent("Game", "Player joined");

    setGameId(lobby.id);
  }

  function onAddBot() {
    const botsCount = lobby.players.filter((p) => p.bot).length;
    const nextLobby = joinLobby(lobby, { id: uniqueId(), name: `AI #${botsCount + 1}`, bot: true });

    onStateChange({ ...nextLobby, synced: false });
    updateGame(nextLobby).catch(logFailedPromise);

    logEvent("Game", "Bot added");
  }

  function onKickPlayer(playerId: string) {
    const nextLobby = removePlayerFromLobby(lobby, playerId);

    onStateChange({ ...nextLobby, synced: false });
    updateGame(nextLobby).catch(logFailedPromise);

    logEvent("Game", "Player kicked");
  }

  async function onStartGame() {
    const game = startGameFromLobby(lobby, Date.now());

    onStateChange({ ...game, synced: false });
    await updateGame(game);

    logEvent("Game", "Game started");
  }

  function onJoinGameSubmit(e: FormEvent) {
    e.preventDefault();
    onJoinGame({ name, bot });

    if (lobby.players.length === 0) {
      localStorage.setItem(NAME_KEY, name);
    }
  }

  return (
    <div className="game bg-main-dark relative flex flex-column w-100 h-100">
      {copied && (
        <div
          className="fixed z-999 bg-white black ph3 pv2 br2 shadow-2 f6 fw5"
          style={{ top: "1rem", left: "50%", transform: "translateX(-50%)" }}
        >
          {t("copied")}
        </div>
      )}
      <Meta players={lobby.players} />

      {showMenu && <MenuArea onCloseArea={() => setShowMenu(false)} />}

      <div className="bg-black-50 pa2 pv2-l ph6.5-m">
        <div className="flex justify-between items-center mb2">
          <Txt uppercase size={TxtSize.MEDIUM} value={t("lobby")} />
          <HomeButton void onClick={() => setShowMenu(true)} />
        </div>
        <Board
          colorBlindMode={colorBlindMode}
          deckCount={deckSize(lobby.options)}
          hints={MaxHints}
          playedCards={[]}
          strikes={0}
          variant={lobby.options.variant}
        />
      </div>

      <div className="flex flex-column bg-black-50 bb b--yellow ph6.5-m pa2">
        {lobby.players.length > 0 && (
          <div className="flex flex-column justify-center mb2">
            <div className="flex items-center">
              <Txt
                value={
                  gameFull
                    ? t("gameFull")
                    : canStart
                    ? t("lobbyReady", { count: lobby.players.length })
                    : t("needMorePlayers")
                }
              />
              {canStart && (
                <Button primary className="ml3" id="start-game" text={t("startGame")} onClick={() => onStartGame()} />
              )}
            </div>
            {selfPlayer && !gameFull && (
              <>
                <div>
                  <Txt className="lavender" value={t("waitForOthers")} />
                  <a className="underline lavender pointer ml1" id="add-ai" onClick={() => onAddBot()}>
                    <Txt value={t("addAi")} />
                  </a>
                </div>
                <div className="mt3">
                  <Txt className="txt-yellow mr2 ttu" size={TxtSize.XXSMALL} value={t("new")} />
                  <Txt value={t("learnWhileWaiting")} />
                  <Link
                    passHref
                    className="ml2 underline lavender ttu pointer"
                    href={`/learn?back-to-game=${lobby.id}`}
                  >
                    <Txt value={t("go")} />
                  </Link>
                </div>
              </>
            )}
          </div>
        )}

        {canJoin && (
          <form className="flex items-start mt3 w-100" onSubmit={onJoinGameSubmit}>
            <div className="flex flex-column justify-left">
              <Txt value={t("choosePlayerName")} />
              <div className="flex justify-center items-center mr2">
                <TextInput
                  autoFocus={true}
                  className="flex-grow-1 mr2"
                  id="player-name"
                  style={{ width: "12rem" }}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Button primary disabled={name.length === 0} id="join-game" text={t("join")} />
              </div>
              {process.env.NODE_ENV !== "production" && !lobby.options.tutorial && (
                <Field
                  label={<Txt className="gray" size={TxtSize.SMALL} value={t("autoplay")} />}
                  style={{ width: "80px" }}
                >
                  <Checkbox checked={bot} className="ml2" id="autoplay" onChange={(e) => setBot(e.target.checked)} />
                </Field>
              )}
            </div>
          </form>
        )}

        {!gameFull && !lobby.options.tutorial && (
          <div className="flex mt3 items-end">
            <div className="flex flex-column flex-grow-1 mr2" style={{ minWidth: 0 }}>
              <Txt className="mb1" value={t("shareGame")} />
              <a className="lavender db truncate" href={shareLink} rel="noopener noreferrer" target="_blank">
                <Txt multiline={false} value={shareLink} />
              </a>
            </div>
            <input ref={inputRef} readOnly className="fixed top--2 left--2" type="text" value={shareLink} />
            <Button outlined className="flex-shrink-0" text={t("copy")} onClick={copy} />
          </div>
        )}
      </div>

      <div className="flex flex-grow-1 flex-column overflow-y-auto" style={{ minHeight: 0 }}>
        {lobby.players.map((player) => {
          const isSelf = isNetwork && player.id === selfPlayer?.id;

          return (
            <PlayerRow key={player.id} className="bb b--yellow-light">
              <div className="flex items-center">
                <a className="pointer grow red mr3 f" onClick={() => onKickPlayer(player.id)}>
                  <Txt value="✕" />
                </a>
                <Txt className="mr3 truncate" style={{ width: "7rem" }} value={player.name} />

                {!isSelf && player.reaction && (
                  <Txt style={{ animation: "FontPulse 600ms 5" }} value={player.reaction} />
                )}

                {isSelf && (
                  <Popover
                    containerClassName="z-999"
                    content={({ position, childRect, popoverRect }) => (
                      <ArrowContainer
                        arrowColor={POPOVER_ARROW_COLOR}
                        arrowSize={10}
                        arrowStyle={{ opacity: 1 }}
                        childRect={childRect}
                        popoverRect={popoverRect}
                        position={position}
                      >
                        <ReactionsPopover
                          hasReaction={player.reaction != null}
                          style={POPOVER_CONTENT_STYLE}
                          onClose={() => setReactionsOpen(false)}
                          onReaction={onReaction}
                        />
                      </ArrowContainer>
                    )}
                    isOpen={reactionsOpen}
                    padding={5}
                    onClickOutside={() => setReactionsOpen(false)}
                  >
                    <a
                      className="pointer grow"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReactionsOpen(!reactionsOpen);
                      }}
                    >
                      {player.reaction && <Txt style={{ animation: "FontPulse 600ms 5" }} value={player.reaction} />}
                      {!player.reaction && <Txt style={{ filter: "grayscale(100%)" }} value="︎︎︎︎😊" />}
                    </a>
                  </Popover>
                )}
              </div>
              <HandStrip>
                <FaceDownHand size={lobbyHandSize} />
              </HandStrip>
            </PlayerRow>
          );
        })}
      </div>

      {isNetwork && (lobby.players.length > 0 || selfPlayer) && (
        <div className="bg-black-50 bt b--yellow ph6.5-m pa2 flex-shrink-0">
          <LobbyChat lobby={lobby} selfPlayer={selfPlayer} />
        </div>
      )}
    </div>
  );
}
