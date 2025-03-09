import {ReactElement} from "react";
import {Character, InitialData, Message, StageBase, StageResponse, User} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";
import {aiMove, Game, getFen, move, moves} from 'js-chess-engine';

type MessageStateType = any;

type ConfigType = any;

type InitStateType = any;

type ChatStateType = any;

const MOVE_REGEX = /([a-hA-H][1-8])/gm

//https://i.imgur.com/L1MLIuJ.png
const BUILD_PIECE = (index: number) => {
    const xPercent = 100 / 3;
    const yPercent = 100 / 2;
    const xPosition = (index % 4) * xPercent;
    const yPosition = (Math.floor(index / 4) * yPercent);
    return `<div style="width: 100%; height: 100%; background-image: url('https://i.imgur.com/L1MLIuJ.png'); background-size: 400% 300%; background-position: ${xPosition}% ${yPosition}%; filter: blur(0.5px);"></div>`;
}

const PIECE_IMAGE: {[key: string]: string} = {
    "K": BUILD_PIECE(0),
    "Q": BUILD_PIECE(1),
    "R": BUILD_PIECE(2),
    "B": BUILD_PIECE(3),
    "N": BUILD_PIECE(4),
    "P": BUILD_PIECE(5),
    "k": BUILD_PIECE(6),
    "q": BUILD_PIECE(7),
    "r": BUILD_PIECE(8),
    "b": BUILD_PIECE(9),
    "n": BUILD_PIECE(10),
    "p": BUILD_PIECE(11),
    " ": ''
}

const PIECE_NAME_MAPPING: {[key: string]: string} = {
    "K": 'the white king',
    "Q": 'the white queen',
    "R": 'a white rook',
    "B": 'a white bishop',
    "N": 'a white knight',
    "P": 'a white pawn',
    "k": 'the black king',
    "q": 'the black queen',
    "r": 'a black rook',
    "b": 'a black bishop',
    "n": 'a black knight',
    "p": 'a black pawn'
}

export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {

    // Saved:
    gameState: any = null;
    wins: number = 0;
    losses: number = 0;
    draws: number = 0;

    // Not saved:
    characters: {[key: string]: Character};
    user: User;
    aiLevel: number = 2;
    boardScale: number = 75;
    takenBlacks: string = '';
    takenWhites: string = '';



    constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {

        super(data);
        const {
            characters,
            users,
            messageState,
            config
        } = data;

        this.characters = characters;
        this.user = users[Object.keys(users)[0]];
        this.loadMessageState(messageState);
        if (config.aiLevel) {
            this.aiLevel = config.aiLevel;
        }
        if (config.boardScale) {
            this.boardScale = config.boardScale;
        }
    }

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {

        return {
            success: true,
            error: null,
            initState: null,
            chatState: null,
        };
    }

    async setState(state: MessageStateType): Promise<void> {
        this.loadMessageState(state);
    }

    loadMessageState(messageState: MessageStateType) {
        if (messageState != null) {
            if (messageState.gameState) {
                this.gameState = JSON.parse(messageState.gameState);
                console.log(this.gameState);
            } else {
                this.gameState = null;
            }
            this.wins = messageState.wins ?? this.wins;
            this.losses = messageState.losses ?? this.losses;
            this.draws = messageState.draws ?? this.draws;
        }
    }

    writeMessageState(): MessageStateType {
        return {
            gameState: this.gameState ? JSON.stringify(this.gameState) : null,
            wins: this.wins,
            losses: this.losses,
            draws: this.draws
        };
    }

    async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {

        const {
            content,
            promptForId
        } = userMessage;

        let aiNote: string|null  = '';
        let boardRendering: string|null = null;

        if (this.gameState == null) {
            if (content.toLowerCase().indexOf('play chess') > -1) {
                // Start a game of chess!
                this.gameState = new Game().exportJson();
                aiNote = `{{user}} wants to play chess, and {{char}} will play along as they set up the board. Point out that {{user}} will be playing white. The game hasn't started yet, though.`;
            }
        } else if (['knock the board', 'throw the board', 'spill the pieces', 'knock over the board', 'bump the board'].filter(phrase => content.toLowerCase().indexOf(phrase) > -1).length > 0) {
            aiNote = `{{user}} has messed up the board; {{char}} will consider this as {{user}} forfeiting--therefore, losing the game.`;
            this.losses++;
            this.gameState = null;
        } else {
            // Playing chess; Check for player's move.
            const matches = content.match(MOVE_REGEX);

            if (matches && matches.length > 0) {
                let coordinates: { [key: string]: string } = {};
                const possibleMoves = moves(this.gameState);
                if (matches.length > 1) {
                    coordinates["start"] = matches[0].toUpperCase();
                    coordinates["end"] = matches[1].toUpperCase();
                    if (!possibleMoves[coordinates["start"]] || !possibleMoves[coordinates["start"]].includes(coordinates["end"])) {
                        aiNote = `{{user}} tried to specify an invalid move. {{char}} may choose to tease or taunt them, but it remains {{user}}'s turn.`;
                    }
                } else {
                    coordinates["end"] = matches[0].toUpperCase();
                    let possibleStarts = Object.keys(possibleMoves).filter(key => possibleMoves[key].includes(coordinates["end"]));
                    if (possibleStarts.length == 1) {
                        coordinates["start"] = possibleStarts[0];
                    } else {
                        aiNote = `{{user}} didn't actually make a move yet; {{char}} may choose to banter with {{user}}, but it remains {{user}}'s turn in this response.`;
                    }
                }

                if (aiNote == '') {
                    // Must be a valid move; make it so.
                    aiNote = `${this.describeMove(coordinates["start"], coordinates["end"], "{{user}}", this.gameState)}`;
                    this.gameState = move(this.gameState, coordinates["start"], coordinates["end"]);
                    console.log(this.gameState);

                    // Check for draw/checkmate
                    if (this.gameState.isFinished) {
                        if (this.gameState.checkMate) {
                            // Player won!
                            this.wins++;
                            aiNote = `\nCheckmate: {{user}} has won the game! {{char}} should respond appropriately.`;

                        } else {
                            // Draw.
                            this.draws++;
                            aiNote = `\nThis game has ended in a draw. {{char}} should respond appropriately.`;
                        }

                        boardRendering = this.buildBoard();
                        this.gameState = null;
                    } else {
                        // Game continues with bot's turn
                        if (this.gameState.check) {
                            // Player put bot in check; make a note
                            aiNote = `\n{{user}}'s move placed {{char}} in check for a moment.`;
                        }
                        // Then, make an AI move:
                        const charMove = aiMove(this.gameState, this.aiLevel ?? 2);
                        aiNote = `${aiNote}\nThen, ${this.describeMove(Object.keys(charMove)[0], charMove[Object.keys(charMove)[0]], "{{char}}", this.gameState)}`;
                        this.gameState = move(this.gameState, Object.keys(charMove)[0], charMove[Object.keys(charMove)[0]]);

                        // Calculate captured pieces:
                        this.takenBlacks = 'kqrrbbnnpppppppp';
                        this.takenWhites = 'KQRRBBNNPPPPPPPP';
                        const pieces: string[] = Object.values(this.gameState.pieces);
                        pieces.forEach(piece => {
                            const blackIndex = this.takenBlacks.indexOf(piece);
                            if (blackIndex > -1) {
                                this.takenBlacks = this.takenBlacks.slice(0, blackIndex) + this.takenBlacks.slice(blackIndex + 1);
                            }
                            const whiteIndex = this.takenWhites.indexOf(piece);
                            if (whiteIndex > -1) {
                                this.takenWhites = this.takenWhites.slice(0, whiteIndex) + this.takenWhites.slice(whiteIndex + 1);
                            }
                        });

                        if (this.gameState.isFinished) {
                            if (this.gameState.checkMate) {
                                // bot won!
                                aiNote = `\nCheckmate: {{char}} has won the game and should celebrate appropriately.`;

                            } else {
                                // Draw.
                                aiNote = `\nThis game has ended in a draw. {{char}} should respond appropriately.`;
                            }
                        }
                    }
                } //else {
                //    console.log('Player did not input a legal move.');
                //}
            } else {
                aiNote = `{{user}} didn't make a move this turn. {{char}} should spend some time chatting, bantering, or antagonizing them, but it will remain {{user}}'s turn.`;
            }
            aiNote = `{{char}} and {{user}} are playing chess; ${(this.wins + this.losses + this.draws > 0) ? `{{user}} has a record of ${this.wins}-${this.losses}-${this.draws} against {{char}}` : `this is their first game together`}.\n` +
                        `${aiNote}\nThis response should focus upon recent moves, {{char}}'s reactions to the current state of the board, and any ongoing conversation or banter from {{char}}. The game is waiting for {{user}}'s next move, which will happen later. For reference, this is the board's current FEN: ${getFen(this.gameState)}`;
        }
        if (aiNote.trim() != '') {
            aiNote = this.replaceTags(`[RESPONSE GUIDE]${aiNote}[/RESPONSE GUIDE]`, {"user": this.user.name, "char": promptForId ? this.characters[promptForId].name : ''});
            console.log(aiNote);
        } else {
            aiNote = null;
        }
        return {
            stageDirections: aiNote,
            messageState: this.writeMessageState(),
            modifiedMessage: null,
            systemMessage: boardRendering,
            error: null,
            chatState: null,
        };
    }

    async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {

        let boardRendering: string|null = null;
        if (this.gameState) {
            boardRendering = this.buildBoard();
            if (this.gameState.isFinished) {
                if (this.gameState.checkMate) {
                    // bot won!
                    this.losses++;
                } else {
                    this.draws++;
                }
                this.gameState = null;
            }
        }

        return {
            stageDirections: null,
            messageState: this.writeMessageState(),
            modifiedMessage: null,
            error: null,
            systemMessage: boardRendering,
            chatState: null
        };
    }

    describeMove(start: string, end: string, playerTag: string, gameState: any) {
        let description = `${playerTag} moves ${PIECE_NAME_MAPPING[gameState.pieces[start]]} from ${start} to ${end}`;
        if (gameState.pieces[end]) {
            description += `, capturing ${PIECE_NAME_MAPPING[gameState.pieces[end]]}`;
        }
        return `${description}.`;
    }

    buildBoard(): string {
        let fen: string = getFen(this.gameState);
        fen = fen.substring(0, fen.indexOf(' '));
        let result = `---\n`;
        let lines = fen.split('/');
        result += `<div style="width: ${this.boardScale}%; padding-bottom: ${this.boardScale * 0.75}%; border: 5px solid darkslategray; border-radius: 5px; position: relative; display: table;"><div style="width: 75%; height: 100%; position: absolute; top: 0; left: 0; background: darkslategray">`;
        for (let index = 0; index < lines.length; index++) {
            result += this.buildRow(lines[index], index + 1);
        }
        result += `</div>${this.buildDiscard()}</div>`;
        return `${result}`;
    }

    buildRow(contents: string, rowNum: number): string {
        let result = `<div style="width: 100%; height: 12.5%; display: flex;">`;
        let colNum = 1;
        for(let index = 0; index < contents.length; index++) {
            const charAt = contents.charAt(index);

            switch (true) {
                case /[bknpqrBKNPQR]/.test(charAt):
                    const coords = `${String.fromCharCode('A'.charCodeAt(0) + colNum - 1)}${8 - rowNum + 1}`;
                    const style = ((rowNum + colNum) % 2) == 0 ?
                        "width: 12.5%; height: 100%; display: flex; position: relative; align-items: center; justify-content: center; font-family: monospace; background: slategray; color: #333;" :
                        "width: 12.5%; height: 100%; display: flex; position: relative; align-items: center; justify-content: center; font-family: monospace; background: #333; color: slategray;"
                    result += this.addSpace(charAt, coords, style);
                    colNum++;
                    break;
                case /\d/.test(charAt):
                    for (let i = 0; i < Number(charAt); i++) {
                        const coords = `${String.fromCharCode('A'.charCodeAt(0) + colNum - 1)}${8 - rowNum + 1}`;
                        const style = ((rowNum + colNum) % 2) == 0 ?
                            "width: 12.5%; height: 100%; display: flex; position: relative; align-items: center; justify-content: center; font-family: monospace; background: slategray; color: #333;" :
                            "width: 12.5%; height: 100%; display: flex; position: relative; align-items: center; justify-content: center; font-family: monospace; background: #333; color: slategray;"
                        result += this.addSpace(` `, coords, style);
                        colNum++;
                    }
                    break;
                default:
            }
        }
        result += `</div>`;
        return result;
    }

    addSpace(char: string, coords: string, style: string): string {
        // return `<div style="${style}"><svg viewBox='0 0 20 20' style='width: 100%; height: 100%;'><text x='0.3' y='18.8' style='font: italic 3px sans-serif;'>${coords}</text><text x='2' y='16.5'>${char}</text></svg></div>`;
        return `<div style="${style} position: relative;"><div style='position: absolute; top: -2px; left: 2px; font-size: 1em; font-style: italic;'>${coords}</div>${PIECE_IMAGE[char]}</div>`;
    }

    buildDiscard(): string {
        let result = `<div style="width: 25%; height: 100%; position: absolute; float: right; top: 0; right: 0;  background: darkslategray;"><div style="width: 100%; height: 50%; display: flex;">`;
        for (let index = 0; index < this.takenBlacks.length; index++) {
            result += this.addSpace(this.takenBlacks.charAt(index), '', "width: 25%; display: flex; position: relative; align-items: center; justify-content: center; font-family: monospace;");
        }
        result += `</div><div style="width: 100%; height: 50%; display: flex;">`
        for (let index = 0; index < this.takenWhites.length; index++) {
            result += this.addSpace(this.takenWhites.charAt(index), '', "width: 25%; display: flex; position: relative; align-items: center; justify-content: center; font-family: monospace;");
        }
        result += `</div></div>`;

        return result;
    }



    replaceTags(source: string, replacements: {[name: string]: string}) {
        return source.replace(/{{([A-z]*)}}/g, (match) => {
            return replacements[match.substring(2, match.length - 2).toLowerCase()];
        });
    }


    render(): ReactElement {

        return <div style={{
            width: '100vw',
            height: '100vh',
            display: 'grid',
            alignItems: 'stretch'
        }}>
        </div>;
    }

}
