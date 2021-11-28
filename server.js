const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 4000;
const typeDefs = require("./typeDefs/typeDefs");
const resolvers = require("./resolvers/resolver");
const mongoose = require("mongoose");
require("dotenv").config();
const guid = require("guid");
const refreshTokens = {};

async function startServer() {
  const app = express();
  // app.use(cors(corsOptions));

  // parse requests of content-type - application/json
  // app.use(express.urlencoded({ extended: true }));
  // app.use(express.json());
  const apolloServer = new ApolloServer({
    context: ({ req }) => {
      const ctx = { email: null, refreshToken: null };
      const cookies = (req.headers?.cookie ?? "")
        .split(";")
        .reduce((obj, c) => {
          const [email, value] = c.split("=");
          obj[email.trim()] = value.trim();
          return obj;
        });
      ctx.refreshToken = cookies?.refreshToken;

      try {
        if (req.headers["x-access-token"]) {
          const token = jwt.verify(
            req.headers["x-access-token"],
            process.env.JWT_SECRET
          );
          ctx.email = token.email;
        }
      } catch (e) {}
      return ctx;
    },
    typeDefs,
    resolvers,
    cors: {
      origin: "http://localhost:8100",
      credentials: true,
      methods: "GET, HEAD, PUT, PATCH, POST",
    },
    formatResponse: (response, requestContext) => {
      if (response.errors && !requestContext.request.variables?.password) {
        if (requestContext.response?.http) {
          requestContext.response.http.status = 401;
        }
      } else if (
        response.data?.authenticateUser?.accessToken ||
        response.data?.refresh
      ) {
        const tokenExpireDate = new Date();
        tokenExpireDate.setTime(
          tokenExpireDate.getTime() + 60 * 60 * 24 * 7 * 1000
        );
        const refreshTokenGuid = guid.raw();
        const token = jwt.verify(
          response.data?.authenticateUser.accessToken || response.data.refresh,
          process.env.JWT_SECRET
        );

        refreshTokens[refreshTokenGuid] = token.data;
        const refreshToken = jwt.sign(
          {
            data: refreshTokenGuid,
          },
          process.env.JWT_SECRET,
          { expiresIn: "7 days" }
        );

        requestContext.response?.http?.headers.append(
          "Set-Cookie",
          `refreshToken=${refreshToken}; expires=${tokenExpireDate}; httpOnly=true;`
        );
      }
      return response;
    },
  });
  await apolloServer.start();

  apolloServer.applyMiddleware({ app: app });

  app.use((req, res) => {
    res.send("Hello from Apollo");
  });

  await mongoose.connect(
    `mongodb+srv://${process.env.DB_PASSWORD}:${process.env.DB_USERNAME}.svans.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`,
    {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    }
  );

  console.log("Mongoose connected...");

  app.listen(port, () => console.log("Server running on port 4000"));
}

startServer();
