# Contains information about indepth parts of building a Web Server

## Dissection of HTTP Request

```http
POST /posts/42/comments HTTP/1.1\r\n
Host: www.my-api.com\r\n
Accept: application/json\r\n
Authorization: Bearer N2E5NTU2MzQ5MGQ4N2UzNjIxOTY2ZDU1M2YwNjA3OGFjYjgyMjU4NQ\r\n
Accept-Encoding: gzip, deflate, br\r\n
Content-Type: application/json\r\n
Content-Length: 28\r\n
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.13; rv:58.0)\r\n
\r\n
{"text":"this is a comment"}
```

### Observations - HTTP Request

- Each line is delimited by `\r\n`
- The first lie is called the `request line.` It's composed of three space-separated tokens:
  - The request method, `POST`. The standard methods are defined in [section 9 of the HTTP/1.1 specification](https://www.rfc-editor.org/rfc/rfc9110#name-methods)
  - The request URI, `/posts/42/comments`
  - The protocol version, `HTTP/1.1`
- Each following line is called teh request header. It's composed of a field and it's value, separated by a `:`. The standard headers are defined in [section 14 of the HTTP/1.1 specification](https://www.rfc-editor.org/rfc/rfc9110#name-field-name-registration).
- There's a line with only `\r\n`. This line indicates the end of the reqeuest header. Anything after that is the request body.
- For this request, the body is a JSON document. THis matches the `Content-Type` header. The JSON document is `28 bytes` long, which matches the `Content-Length` header.

## Dissection of HTTP Response

```http
HTTP/1.1 200 OK\r\n
Server: nginx/1.9.4\r\n
Date: Fri, 20 Apr 2017 16:19:42 GMT\r\n
Content-Type: application/json\r\n
Content-Length: 141\r\n
\r\n
{
  "id": "8fh924b42o",
  "text": "this is a comment",
  "createdAt": "2017-04-20T16:19:42.840Z",
  "updatedAt": "2017-04-20T16:19:42.840Z"
}
```

### Observations - HTTP Reseponse

- Like the request, each line is delimited by `\r\n`.
- The first line is called the `status line.` It's compsed of:
  - The HTTP version, `HTTP/1.1`
  - An HTTP [status code](https://www.rfc-editor.org/rfc/rfc9110.html#name-status-codes), `200`
  - A [reason phrase](https://www.rfc-editor.org/rfc/rfc9110.html#name-status-codes), `OK`
- Each line after that is a response Header, which have the same structure as request headers.
- There's a line with only `\r\n`. This indicates the end of the response headers and the start of the response body.
- The body is a `141-byte` JSON document. This matches the values in the response headers (`Content-Type` & `Content-Length`).
