import Hyperswarm from "hyperswarm";

export class Peer {
  constructor() {
    this.swarm = new Hyperswarm();

    this.peers = new Set();
  }

  async connect(topic, core) {
    this.swarm.join(topic);

    // When we find a peer
    this.swarm.on("connection", (socket, info) => {
      this.peers.add(socket);

      console.log("we connected");

      core.replicate(socket, {
        live: true,
        encrypt: true,
      });
      // // Log sync events
      core.on("sync", () => {
        console.log("Sync complete with peer");
      });

      core.on("append", () => {
        console.log("New data appended, will sync to peers");
      });

      socket.on("close", () => {
        this.peers.delete(socket);
      });
    });
  }
}
