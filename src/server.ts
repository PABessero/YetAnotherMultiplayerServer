import * as express from "express";
import * as http from "http";
import * as WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import { BuildableObject } from "./objects/BuildableObject";
import { Player } from "./objects/Player";
import { Tile } from "./objects/Tile";

const app = express();

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

let clients: WebSocket[] = [];

let objects: BuildableObject[] = [];
let players: Player[] = [];
let tiles: {
  layer: number;
  tiles: Tile[];
}[] = [];

function broadcast(message: string) {
  for (let client of clients) {
    client.send(message);
  }
}

function broadcast_without_self(message: string, excluded: WebSocket) {
  for (let client of clients) {
    if (client != excluded) {
      client.send(message);
    }
  }
}
wss.on("connection", (ws) => {
  clients.push(ws);
  console.log("New Connection");

  for (let object of objects) {
    ws.send(
      JSON.stringify({
        ACTION: "CREATE",
        OBJECT: JSON.stringify(object),
      }),
    );
  }

  for (let player of players) {
    ws.send(
      JSON.stringify({
        ACTION: "CREATE_PLAYER",
        OBJECT: player,
      }),
    );
  }

  for (let tileLayer of tiles) {
    for (let tile of tileLayer.tiles) {
      if (tile.brush_name != null) {
        ws.send(
          JSON.stringify({
            ACTION: "CREATE_BRUSH",
            OBJECT: tile,
          }),
        );
      }
    }
  }

  const player = new Player(uuidv4());

  ws.send(
    JSON.stringify({
      ACTION: "INIT_UUID",
      OBJECT: player,
    }),
  );

  // broadcast_without_self()

  ws.on("message", (data, isBinary) => {
    if (isBinary) {
      console.log("BIN");
      return;
    }

    if (JSON.parse(data.toString())) {
      const json_message = JSON.parse(data.toString());
      switch (json_message["ACTION"]) {
        case "CREATE":
          console.log(
            `[INFO] Creation of ${json_message["OBJECT"]} at X: ${json_message["POS_X"]} Y: ${json_message["POS_Y"]} (${json_message["Width"]} x ${json_message["Height"]}`,
          );
          const newObject = new BuildableObject(
            json_message["OBJECT"],
            uuidv4(),
            json_message["POS_X"],
            json_message["POS_Y"],
            json_message["Height"],
            json_message["Width"],
          );
          objects.push(newObject);
          const creationResponse = {
            ACTION: "CREATE",
            OBJECT: JSON.stringify(newObject),
          };
          console.log(creationResponse);
          broadcast(JSON.stringify(creationResponse));
          break;
        case "DELETE":
          console.log(`[INFO] Deletion of object (${json_message["UUID"]}`);
          const objectIndex = objects.findIndex(
            (object) => object.id === json_message["UUID"],
          );
          objects.splice(objectIndex, 1);
          const deletionResponse = {
            ACTION: "DELETE",
            OBJECT: {
              UUID: json_message["UUID"],
            },
          };
          console.log(JSON.stringify(deletionResponse));
          broadcast(JSON.stringify(deletionResponse));
          break;
        case "UPDATE_PLAYER":
          // console.log(
          //   `[INFO] Updating position of player ${json_message["UUID"]} X: ${json_message["X"]} Y: ${json_message["Y"]}`,
          // );
          player.posX = json_message["X"];
          player.posY = json_message["Y"];
          broadcast_without_self(
            JSON.stringify({
              ACTION: "UPDATE_PLAYER",
              OBJECT: player,
            }),
            ws,
          );
          break;
        case "CREATE_BRUSH":
          console.log(
            `[INFO] Creating / Updating Tile with brush ${json_message["OBJECT"]} X: ${json_message["X"]} Y: ${json_message["Y"]} (Layer ${json_message["Layer"]})`,
          );

          const layer = tiles.find(
            (layer) => layer.layer == json_message["Layer"],
          );

          if (layer != null) {
            let tile = layer.tiles.find(
              (tile) =>
                tile.x == json_message["X"] && tile.y == json_message["Y"],
            );

            if (tile != null) {
              tile.brush_name = json_message["OBJECT"];
              tile.tile_name = null;
            } else {
              console.log("UNKNOWN TILE");

              tile = new Tile(json_message["X"], json_message["Y"]);
              tile.brush_name = json_message["OBJECT"];
              tile.tile_name = null;

              layer.tiles.push(tile);
            }

            broadcast(
              JSON.stringify({
                ACTION: "CREATE_BRUSH",
                OBJECT: tile,
              }),
            );
          } else {
            const newTile = new Tile(json_message["X"], json_message["Y"]);
            newTile.brush_name = json_message["OBJECT"];
            newTile.tile_name = null;

            tiles.push({
              layer: json_message["Layer"],
              tiles: [newTile],
            });

            broadcast(
              JSON.stringify({
                ACTION: "CREATE_BRUSH",
                OBJECT: newTile,
              }),
            );
          }

          console.log(tiles);

          break;
        case "DELETE_BRUSH":
          console.log(
            `[INFO] Deleting Tile with brush ${json_message["OBJECT"]} X: ${json_message["X"]} Y: ${json_message["Y"]} (Layer ${json_message["Layer"]})`,
          );
          const layer_delete = tiles.find(
            (layer) => layer.layer == json_message["Layer"],
          );

          if (layer_delete != null) {
            let tile = layer_delete.tiles.findIndex(
              (tile) =>
                tile.x == json_message["X"] && tile.y == json_message["Y"],
            );

            layer_delete.tiles.splice(tile, 1);
            broadcast(
              JSON.stringify({
                ACTION: "DELETE_BRUSH",
                OBJECT: {
                  brush_name: json_message["OBJECT"],
                  x: json_message["X"],
                  y: json_message["Y"],
                },
              }),
            );
          }
          break;
        default:
          console.log(data.toString());
      }
    }
  });
  ws.on("close", () => {
    console.log("Disconnected");
    players.splice(players.indexOf(player), 1);
    broadcast(JSON.stringify(""));
  });
});

server.listen(8999, () => {
  // @ts-ignore
  console.log(`Server started on port ${server.address().port}`);
});
