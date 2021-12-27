const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const { AuthenticationError } = require("apollo-server-errors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 4000;
const typeDefs = require("./typeDefs/typeDefs");
const resolvers = require("./resolvers/resolver");
const mongoose = require("mongoose");
require("dotenv").config();
const guid = require("guid");
const cookieParser = require("cookie-parser");
const { uploadFile, getFileStream, uploadObjects } = require("./s3");
const cors = require("cors");
const fs = require("fs");
const util = require("util");
const unlinkFile = util.promisify(fs.unlink);
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const User = require("./models/User.model");

const path = require("path");
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

  let userEmail = "";
  let refUserToken;
  let tokenMatch = false;
  const apolloServer = new ApolloServer({
    context: async ({ req }) => {
      let ctx = {
        email: null,
        userId: null,
        refreshToken: null,
        matchingToken: false,
        validAccessToken: false,
      };
      const currentTimeStamp = Math.round(new Date().getTime() / 1000);
      const cookies = (req.headers?.cookie ?? "").split(";");
      if (cookies) {
        cookies.map((cookie) => {
          if (cookie.includes(process.env.REF_COOKIE_NAME)) {
            const refToken = cookie.split("=");
            refUserToken = refToken[1];
          }
        });
      }
      try {
        if (req.headers.authorization) {
          const credential = req.headers.authorization.split(" ");
          const token = jwt.verify(credential[1], process.env.JWT_SECRET);
          if (token.email) {
            ctx.email = token.email;
            userEmail = token.email;
            ctx.userId = token.userId;
            async function checkCredentials() {
              const user = await User.findOne({ email: token.email });
              if (user) {
                if (refUserToken === user.refreshToken) {
                  const refTokenValidity = jwt.verify(
                    user.refreshToken,
                    process.env.JWT_SECRET
                  );
                  if (
                    refTokenValidity.data &&
                    refTokenValidity.exp > currentTimeStamp
                  ) {
                    ctx.matchingToken = true;
                    tokenMatch = true;
                    if (token.exp > currentTimeStamp && ctx.matchingToken) {
                      ctx.validAccessToken = true;
                    }
                  } else {
                    const refreshTokenGuid = guid.raw();
                    const refreshToken = jwt.sign(
                      {
                        data: refreshTokenGuid,
                      },
                      process.env.JWT_SECRET,
                      { expiresIn: "2 days" }
                    );
                    refUserToken = refreshToken;
                    ctx.matchingToken = true;
                    tokenMatch = true;
                    if (token.exp > currentTimeStamp && ctx.matchingToken) {
                      ctx.validAccessToken = true;
                    }
                    await User.findOneAndUpdate(
                      { email: token.email },
                      { refreshToken: refreshToken }
                    );
                  }
                }
              }
            }
            await checkCredentials();
          }
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

        //Set cookie if user has just logged in
        if (response.data?.authenticateUser?.email) {
          const refreshTokenGuid = guid.raw();

          const refreshToken = jwt.sign(
            {
              data: refreshTokenGuid,
            },
            process.env.JWT_SECRET,
            { expiresIn: "2 days" }
          );
          requestContext.response?.http?.headers.append(
            "Set-Cookie",
            `${process.env.REF_COOKIE_NAME}=${refreshToken}; expires=${tokenExpireDate}; httpOnly=true;`
          );

          User.findOneAndUpdate(
            { email: response.data?.authenticateUser?.email },
            { refreshToken: refreshToken }
          )
            .then((res) => {})
            .catch((error) => {
              throw new Error("An error occured setting your credentials");
            });
        } else if (tokenMatch) {
          requestContext.response?.http?.headers.append(
            "Set-Cookie",
            `${process.env.REF_COOKIE_NAME}=${refUserToken}; expires=${tokenExpireDate}; httpOnly=true;`
          );
        }
        requestContext.response?.http?.headers.append(
          "Access-Control-Allow-Origin",
          process.env.CLIENT
        );
      }
      return response;
    },
  });
  await apolloServer.start();

  app.get("/images/:key", (req, res) => {
    const key = req.params.key;
    const readStream = getFileStream(key);

    readStream.pipe(res);
  });

  app.post("/images", upload.array("files[]", 10), async (req, res, next) => {
    if (!req.file && !req.files) {
      return res.status(200).json({ message: "No file provided" });
    }
    try {
      if (req.headers.authorization) {
        const credential = req.headers.authorization.split(" ");
        const token = jwt.verify(credential[1], process.env.JWT_SECRET);
        if (token) {
          const currentTimeStamp = Math.round(new Date().getTime() / 1000);
          if (token.exp > currentTimeStamp) {
            const files = req.files;
            const responses = [];

            const result = await uploadObjects(files);
            //await unlinkFile(file.path);

            // console.log(result);
            // return res.status(201).json({upload.single("files"),
            //   imageUrl: `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${uniqueName}`,
            // });
            return res.status(200).json({ imagePath: result });
          } else {
            throw new AuthenticationError(
              "You are not authorized to make this operation"
            );
          }
        } else {
          throw new AuthenticationError(
            "You are not authorized to make this operation"
          );
        }
      }
    } catch (e) {}
  });

  apolloServer.applyMiddleware({ app: app });
  console.log("I got here after apply middleware()");
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
