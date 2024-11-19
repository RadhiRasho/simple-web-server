import net, { type Socket } from "node:net";

const server = net.createServer();

function handleConnection(socket: Socket) {
	socket.on("data", (chunk) => {
		console.log(`Recieved chunk: \n ${chunk.toString()}\r\n`);
	});

	socket.write(
		"HTTP/1.1 200 OK\r\nServer: my-web-server\r\nContent-Length: 0\r\n\r\n",
	);
}

function handleConnectionSocket(socket: Socket) {
	// subscribe to the readable event once so we can start calling .read()
	socket.once("readable", () => {
		// Set up a buffer to hold the incoming data
		let reqBuffer = Buffer.from("");

		// Set up a temporary buffer to read in chunks
		let buf: Uint8Array | null;
		let reqHeader = "";

		while (true) {
			// Read data from the socket
			buf = socket.read();

			// Stop if there's no more data
			if (buf === null) break;

			// Concatenate existing request buffer with new data
			reqBuffer = Buffer.concat([reqBuffer, buf]);

			// Check if we've reached \r\n\r\n, indicating end of headers
			const marker = reqBuffer.indexOf("\r\n\r\n");
			if (marker !== -1) {
				// If we reached \r\n\r\n, there could be data after it. Take note.
				const remaining = reqBuffer.subarray(marker + 4);

				// The header is everything we read, up to and not including \r\n\r\n
				reqHeader = reqBuffer.subarray(0, marker).toString();

				// This pushes the extra data we read back to the socket's readable stream
				socket.unshift(remaining);
				break;
			}
		}

		console.log(`Request Header: \n ${reqHeader}`);

		// At this point, we've stopped reading from the socket and have the header as a string
		// If we wanted to read the whole request body, we would do this
		reqBuffer = Buffer.from("");

		while (true) {
			buf = socket.read();
			if (buf === null) break;

			reqBuffer = Buffer.concat([reqBuffer, buf]);
		}

		const reqBody = reqBuffer.toString();
		console.log(`Request body: \n ${reqBody}`);

		// Send a generic response
		socket.end(
			"HTTP/1.1 200 OK\r\nServer: my-custom-server\r\nContent-Length: 0\r\n\r\n",
		);
	});
}

// server.on("connection", handleConnection);
server.on("connection", handleConnectionSocket);
server.listen(3000);
