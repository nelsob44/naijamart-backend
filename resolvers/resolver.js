const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const User = require("../models/User.model");
const Product = require("../models/Product.model");
const { AuthenticationError } = require("apollo-server-errors");
const { GraphQLUpload, graphqlUploadExpress } = require("graphql-upload");
const guid = require("guid");

const resolvers = {
  Upload: GraphQLUpload,
  Query: {
    getUser: async (_parent, { id }, _context, _info) => {
      return await User.findById(id);
    },

    getMyProducts: async (parent, args, _context, info) => {
      if (_context.email) {
        const sellerEmail = _context.email;
        try {
          const products = await Product.find({ sellerEmail });
          return products;
        } catch (err) {
          throw new Error(err);
        }
      } else {
        throw new Error("You are not authorised to make this operation");
      }
    },
  },

  Mutation: {
    createUser: async (parent, args, context, info) => {
      const {
        firstName,
        lastName,
        email,
        password,
        phoneNumber,
        country,
        city,
        address,
      } = args.user;
      const user = await User.findOne({ email });
      try {
        if (!user) {
          const hashedPassword = await bcrypt.hash(password, 12);
          const user = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            phoneNumber,
            country,
            city,
            address,
          });
          await user.save();
          return user;
        } else {
          throw new Error("User already exists");
        }
      } catch (error) {
        return error;
      }
    },
    deleteUser: async (parent, args, context, info) => {
      const { id } = args;
      await User.findByIdAndDelete(id);
      return "User successfully deleted";
    },
    updateUser: async (parent, args, context, info) => {
      const { id } = args;
      const {
        firstName,
        lastName,
        email,
        password,
        phoneNumber,
        country,
        city,
        address,
      } = args.user;
      if (context?.email) {
        const user = await User.findByIdAndUpdate(
          id,
          {
            firstName,
            lastName,
            email,
            password,
            phoneNumber,
            country,
            city,
            address,
          },
          { new: true }
        );
        return user;
      } else {
        throw new AuthenticationError("Invalid credentials!");
      }
    },
    authenticateUser: async (parent, args, context, info) => {
      const { email, password } = args.user;
      const user = await User.findOne({ email });
      if (user) {
        const isEqual = await bcrypt.compare(password, user.password);
        const userId = user._id.toString();
        if (!isEqual) {
          const error = new Error("Wrong email/password combination!");
          error.statusCode = 401;
          throw error;
        } else {
          // const refreshTokenGuid = guid.raw();

          // const refreshToken = jwt.sign(
          //   {
          //     data: refreshTokenGuid,
          //   },
          //   process.env.JWT_SECRET,
          //   { expiresIn: "2 days" }
          // );
          // const newUser = await User.findOneAndUpdate(
          //   { email: email },
          //   { refreshToken: refreshToken }
          // );
          const token = jwt.sign(
            {
              email: user.email,
              userId: user._id.toString(),
            },
            process.env.JWT_SECRET,
            { expiresIn: 3000 }
          );
          return {
            accessToken: token,
            email: user.email,
            firstName: user.firstName,
            userId: user._id.toString(),
            privilege: user.privilegeLevel,
          };
        }
      } else {
        throw new Error("User not found");
      }
    },
    addProduct: async (parent, args, context, info) => {
      console.log("got here now validAccessToken ", context?.validAccessToken);
      if (context?.validAccessToken) {
        const {
          category,
          description,
          price,
          title,
          minOrder,
          sellerLocation,
          furtherDetails,
          availableQuantity,
          discount,
          promoStartDate,
          promoEndDate,
          images,
        } = args.product;
        try {
          const product = new Product({
            category,
            description,
            price,
            title,
            minOrder,
            sellerLocation,
            sellerEmail: context.email,
            furtherDetails,
            availableQuantity,
            discount,
            promoStartDate,
            promoEndDate,
            images,
          });
          await product.save();
          return product;
        } catch (err) {
          throw new Error(err);
        }
      } else {
        throw new AuthenticationError(
          "You are not authorized to make this operation"
        );
      }
    },
    refresh: (parent, args, context, info) => {
      const { refreshToken } = context;
      const token = jwt.verify(refreshToken, process.env.JWT_SECRET);
      if (token.data in refreshTokens) {
        return jwt.sign(
          { data: refreshTokens[token.data] },
          process.env.JWT_SECRET,
          { expiresIn: "7 days" }
        );
      }
    },
    // singleUpload: async (parent, { file }) => {
    //   const { createReadStream, filename, mimetype, encoding } = await file;

    //   // Invoking the `createReadStream` will return a Readable Stream.
    //   // See https://nodejs.org/api/stream.html#stream_readable_streams
    //   const stream = createReadStream();

    //   // This is purely for demonstration purposes and will overwrite the
    //   // local-file-output.txt in the current working directory on EACH upload.
    //   const out = require("fs").createWriteStream("local-file-output.txt");
    //   stream.pipe(out);
    //   await finished(out);

    //   return { filename, mimetype, encoding };
    // },
  },
};

module.exports = resolvers;
