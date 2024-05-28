import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Extrae los headers, método y cuerpo de la solicitud
  const headers = event.headers;
  const method = event.httpMethod;
  const body = event.body;

  // Construye la respuesta
  const response = {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "Hello World!",
      received: {
        headers: headers,
        method: method,
        body: body,
      },
    }),
  };

  return response;
};
