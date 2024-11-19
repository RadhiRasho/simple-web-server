import type {
	IncomingMessage,
	OutgoingHttpHeader,
	OutgoingHttpHeaders,
	OutgoingMessage,
} from "node:http";
import net, { type Socket } from "node:net";

type Handler = {
	(req: IncomingMessage, res: OutgoingMessage): void;
	(
		arg0: {
			method: string;
			url: string;
			httpVersion: string;
			headers: Record<string, string>;
			socket: net.Socket;
		},
		arg1: {
			write(chunk: Uint8Array | string): void;
			end(chunk: Uint8Array | string): void;
			setHeader: (key: string, value: string | number) => void;
			setStatus(newStatus: number, newStatusText: string): void;
			json(data: unknown): void;
		},
	): void;
};

function createWebServer(requestHandler: Handler) {
	const server = net.createServer();

	server.on("connection", handleConnection);

	function handleConnection(socket: Socket) {
		// Subscrive to the readable event once so we can start calling read();
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

				// Check if we've reached \r\n\r\n, indicating end of header
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

			/* Request-related business */
			// Start parsing the header
			const reqHeaders = reqHeader.split("\r\n");

			// First line is special
			const reqline = reqHeaders.shift()?.split(" ");

			// Further lines are one header per line, build an object out of it.
			const headers = reqHeaders.reduce(
				(acc: Record<string, string>, currentHeader) => {
					const [key, value] = currentHeader.split(":");

					acc[key.trim().toLowerCase()] = value.trim();

					return acc;
				},
				{},
			);

			// this object will be sent to the handleRequest callback
			if (!reqline) {
				socket.destroy(new Error("Invalid request line"));
				return;
			}

			const request = {
				method: reqline[0],
				url: reqline[1],
				httpVersion: reqline[2].split("/")[1],
				headers,
				socket, // The user of this web server can directly read from the socket to get the request body
			};

			/* Resposne-related business */
			// Initial values
			let status = 200;
			let statusText = "OK";
			let headersSent = false;
			let isChunked = false;

			const responseHeaders: Record<string, string | number> = {
				server: "my-customer-server",
			};

			function setHeader(key: string, value: string | number) {
				responseHeaders[key.toLowerCase()] = value;
			}

			function sendHeaders() {
				// Only do this once :)
				if (!headersSent) {
					headersSent = true;

					// Add the date header
					setHeader("date", new Date().toISOString());

					// Send teh status line
					socket.write(`HTTP/1.1 ${status} ${statusText}\r\n`);

					// Send each following header
					for (const [key, value] of Object.entries(responseHeaders)) {
						socket.write(`${key}: ${value}\r\n`);
					}

					// Add the final \r\n that delimits the response headers from the body
					socket.write("\r\n");
				}
			}

			const response = {
				write(chunk: Uint8Array | string) {
					if (!headersSent) {
						// If there's no content-length header, then specify Transfer-Encoding chunked
						if (!responseHeaders["content-length"]) {
							isChunked = true;
							setHeader("transfer-encoding", "chunked");
						}
						sendHeaders();
					}

					if (isChunked) {
						const size = chunk.length.toString(16);
						socket.write(`${size}\r\n`);
						socket.write(chunk);
						socket.write("\r\n");
					} else {
						socket.write(chunk);
					}
				},
				end(chunk: Uint8Array | string) {
					if (!headersSent) {
						// We know the full length of the response, let's set it
						if (!responseHeaders["content-length"]) {
							// Assume that chunk is a buffer, not a string!
							setHeader("content-length", chunk ? chunk.length : 0);
						}
						sendHeaders();
					}
					if (isChunked) {
						if (chunk) {
							const size = chunk.length.toString(16);

							socket.write(`${size}\r\n`);
							socket.write(chunk);
							socket.write("\r\n");
						}
						socket.end("0\r\n\r\n");
					} else {
						socket.end(chunk);
					}
				},
				setHeader,
				setStatus(newStatus: number, newStatusText: string) {
					status = newStatus;
					statusText = newStatusText;
				},
				json(data) {
					if (headersSent) {
						throw new Error("Headers sent, cannot proceed to send JSON");
					}

					const json = Buffer.from(JSON.stringify(data));
					setHeader("content-type", "application/json; charset=utf-8");
					setHeader("content-length", json.length);

					sendHeaders();
					socket.end(json);
				},
			};

			// Send the request to the handler!
			requestHandler(request, response);
		});
	}

	return {
		listen: (port: number) => {
			console.log(`server listening on: ${port}`);

			server.listen(port);
		},
	};
}

const webServer = createWebServer((req, res) => {
	// This is the as our original code with the http module :)
	console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
	res.setHeader("Content-Type", "text/plain");
	res.write("hi there \n");
	res.end("Hello World");
});

webServer.listen(3000);
