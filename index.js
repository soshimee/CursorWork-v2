import fs from "fs/promises";
import util from "node:util";
import http from "http";
import mime from "mime-types";
import path from "path";
import { Server } from "socket.io";

const host = "0.0.0.0";
const port = 39172;

const server = http.createServer(async (req, res) => {
	const url = new URL(req.url, `${req.protocol}://${req.headers.host}/`);

	if (url.pathname === "/") {
		res.writeHead(301, { Location: "index.html" });
		res.end();
	} else {
		try {
			const data = await fs.readFile(`web/${url.pathname}`);
			res.writeHead(200, { "Content-Type": mime.contentType(path.extname(url.pathname)) });
			res.end(data.toString());
		} catch (error) {
			if (error.code === "ENOENT") {
				res.writeHead(404);
				res.end();
			} else {
				res.writeHead(500);
				res.end();
			}
		}
	}
});

const io = new Server(server);

io.on("connection", async socket => {
	socket.data = {
		current: {
			name: "Guest",
			position: [0, 0],
			storage: [0, 1],
			power: 1,
			money: 0,
			rank: "default",
			login: false
		},
		previous: {
			name: null,
			position: null,
			storage: null,
			power: null,
			money: null,
			rank: null,
			login: null
		}
	}

	socket.join("main");

	io.sockets.sockets.forEach(socket2 => {
		socket.emit("cursor add", socket2.id);
	});
	socket.to("main").emit("cursor add", socket.id);

	socket.on("login", async (username, password) => {
		if (typeof username !== "string") return;
		if (typeof password !== "string") return;
		if (username.length > 16) return;
		if (password.length > 256) return;
		if (username.length < 1) return;
		if (password.length < 1) return;
		if (!/^[A-Za-z_]*$/.test(username)) return;
		const usernameBase64 = Buffer.from(username, "utf8").toString("base64");
		let userData;
		try {
			userData = JSON.parse(await fs.readFile(`users/${usernameBase64}.json`, "utf8"));
		} catch (error) {
			if (error.code === "ENOENT") {
				userData = {
					password,
					data: {
						name: username,
						position: [0, 0],
						storage: [0, 1],
						power: 1,
						money: 0,
						rank: "default",
						login: true
					}
				};
				await fs.writeFile(`users/${usernameBase64}.json`, JSON.stringify(userData), "utf8");
			} else {
				throw error;
			}
		}
		if (userData.password !== password) return;
		socket.data.current = userData.data;
	});

	socket.on("logout", () => {
		socket.data.current = {
			name: "Guest",
			position: [0, 0],
			storage: [0, 1],
			power: 1,
			money: 0,
			rank: "default",
			login: false
		};
	});

	socket.on("position", position => {
		if (!Array.isArray(position)) return;
		if (position.length !== 2) return;
		if (typeof position[0] !== "number") return;
		if (typeof position[1] !== "number") return;
		if (!Number.isInteger(position[0])) return;
		if (!Number.isInteger(position[1])) return;
		socket.data.current.position[0] = position[0];
		socket.data.current.position[1] = position[1];
	});

	socket.on("disconnect", () => {
		io.to("main").emit("cursor remove", socket.id);
	});

	socket.on("upgrade storage", amount => {
		if (typeof amount !== "number") return;
		if (!Number.isInteger(amount)) return;
		if (amount < 1) return;
		if (socket.data.current.money < amount) return;
		socket.data.current.money -= amount;
		socket.data.current.storage[1] += amount;
	});

	socket.on("upgrade power", amount => {
		if (typeof amount !== "number") return;
		if (!Number.isInteger(amount)) return;
		if (amount < 1) return;
		if (socket.data.current.money < amount) return;
		socket.data.current.money -= amount;
		socket.data.current.power += amount;
	});

	socket.on("chat", message => {
		if (!socket.data.current.login) {
			socket.emit("chat", "Server", "Please login to use the chat feature.");
			return;
		}
		if (typeof message !== "string") return;
		if (message.length > 256) return;
		if (message.length < 1) return;
		io.to("main").emit("chat", socket.data.current.name, message);
	});
});

setInterval(() => {
	io.sockets.sockets.forEach(socket => {
		const data = {};
		for (const key in socket.data.current) {
			if (!util.isDeepStrictEqual(socket.data.current[key], socket.data.previous[key])) {
				socket.data.previous[key] = JSON.parse(JSON.stringify(socket.data.current[key]));
				data[key] = socket.data.current[key];
			}
		}
		if (Object.keys(data).length > 0) io.to("main").emit("cursor data", socket.id, data);
	});
}, 100);

setInterval(() => {
	io.sockets.sockets.forEach(socket => {
		if (socket.data.current.position[0] < 100) {
			if (socket.data.current.storage[0] > 0) {
				socket.data.current.money += socket.data.current.storage[0];
				socket.data.current.storage[0] = 0;
			}
		} else if (socket.data.current.position[0] > 700) {
			if (socket.data.current.storage[0] < socket.data.current.storage[1]) {
				socket.data.current.storage[0] += socket.data.current.power;
				if (socket.data.current.storage[0] > socket.data.current.storage[1]) socket.data.current.storage[0] = socket.data.current.storage[1];
			}
		}
	});
}, 1000);

setInterval(() => {
	io.sockets.sockets.forEach(async socket => {
		if (socket.data.current.login) {
			const usernameBase64 = Buffer.from(socket.data.current.name, "utf8").toString("base64");
			const userData = JSON.parse(await fs.readFile(`users/${usernameBase64}.json`, "utf8"));
			userData.data = socket.data.current;
			await fs.writeFile(`users/${usernameBase64}.json`, JSON.stringify(userData), "utf8");
		}
	});
}, 10000);

server.listen(port, host);