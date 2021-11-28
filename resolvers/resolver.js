const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User.model");
const { AuthenticationError } = require("apollo-server-errors");

const resolvers = {
  Query: {
    hello: () => {
      return "Hello world! modified";
    },
    getUser: async (_parent, { id }, _context, _info) => {
      return await User.findById(id);
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
          const token = jwt.sign(
            {
              email: user.email,
              userId: user._id.toString(),
            },
            process.env.JWT_SECRET,
            { expiresIn: 300 }
          );
          return {
            accessToken: token,
            email: user.email,
            firstName: user.firstName,
            userId: user._id.toString(),
          };
        }
      } else {
        throw new AuthenticationError("User not found!");
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
  },
};

module.exports = resolvers;
