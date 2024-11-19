// simple server implementation of the builtin http module.
import http from "node:http";

const server = http.createServer();

server.on("request", (req, res) => {
	console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

	res.setHeader("Content-Type", "text/plain");
	res.end("Hello World");
});

server.listen(3000);
