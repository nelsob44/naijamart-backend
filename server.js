const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 4000;
const typeDefs = require("./typeDefs/typeDefs");
const resolvers = require("./resolvers/resolver");
const mongoose = require("mongoose");
require("dotenv").config();
const guid = require("guid");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const refreshTokens = [];

// const corsOptions = {
//   origin: ["http://localhost:8100/"],
//   optionsSuccessStatus: 200,
//   credentials: true,
//   methods: "GET, HEAD, PUT, PATCH, POST, OPTIONS",
//   exposedHeaders: "*",
// };

async function startServer() {
  const app = express();
  app.use(cookieParser());
  //app.use(cors(corsOptions));
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", process.env.CLIENT);
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    res.setHeader("Access-Control-Allow-Credentials", true);
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Cookie, Accept, Host, Referer, Accept-Encoding"
    );
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // parse requests of content-type - application/json
  // app.use(express.urlencoded({ extended: true }));
  // app.use(express.json());
  const apolloServer = new ApolloServer({
    context: ({ req }) => {
      let ctx = {
        email: null,
        userId: null,
        refreshToken: null,
        matchingToken: false,
        validAccessToken: false,
      };
      const cookies = (req.headers?.cookie ?? "").split(";");
      if (cookies) {
        cookies.map((cookie) => {
          if (cookie.includes(process.env.REF_COOKIE_NAME)) {
            const refToken = cookie.split("=");
            ctx.refreshToken = refToken[1];
            if (refreshTokens[0] === refToken[1]) {
              ctx.matchingToken = true;
            }
          }
        });
      }

      try {
        if (req.headers.authorization) {
          const credential = req.headers.authorization.split(" ");
          const token = jwt.verify(credential[1], process.env.JWT_SECRET);
          if (token) {
            const currentTimeStamp = Math.round(new Date().getTime() / 1000);
            if (token.exp > currentTimeStamp) {
              ctx.validAccessToken = true;
            }
          }
          ctx.email = token.email;
          ctx.userId = token.userId;
        }
      } catch (e) {}
      return ctx;
    },
    typeDefs,
    resolvers,
    cors: false,
    formatResponse: (response, requestContext) => {
      if (response.errors && !requestContext.request.variables?.password) {
        if (requestContext.response?.http) {
          requestContext.response.http.status = 401;
        }
      } else {
        const tokenExpireDate = new Date();
        tokenExpireDate.setTime(
          tokenExpireDate.getTime() + 60 * 60 * 24 * 7 * 1000
        );
        refreshTokens.length = 0;
        const refreshTokenGuid = guid.raw();
        // const token = jwt.verify(
        //   response.data?.authenticateUser.accessToken || response.data.refresh,
        //   process.env.JWT_SECRET
        // );

        // const currentTimeStamp = Math.round(new Date().getTime() / 1000);
        // console.log("verified token is ", token);
        // console.log("timestamp is ", currentTimeStamp);

        const refreshToken = jwt.sign(
          {
            data: refreshTokenGuid,
          },
          process.env.JWT_SECRET,
          { expiresIn: "7 days" }
        );
        refreshTokens.push(refreshToken);
        requestContext.response?.http?.headers.append(
          "Access-Control-Allow-Origin",
          process.env.CLIENT
        );

        requestContext.response?.http?.headers.append(
          "Set-Cookie",
          `${process.env.REF_COOKIE_NAME}=${refreshToken}; expires=${tokenExpireDate}; httpOnly=true;`
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
    `mongodb+srv://${process.env.DB_PASSWORD}:${process.env.DB_USERNAME}.svans.mongodb.net/malaminoDB?retryWrites=true&w=majority`,
    {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    }
  );

  console.log("Mongoose connected...");

  app.listen(port, () => console.log("Server running on port 4000"));
}

startServer();
