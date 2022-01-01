const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const User = require("../models/User.model");
const Product = require("../models/Product.model");
const { AuthenticationError } = require("apollo-server-errors");
const { GraphQLUpload, graphqlUploadExpress } = require("graphql-upload");
const { deleteObjects } = require("../s3");
const guid = require("guid");

const imagesCarousel = [];

function transformImagePath(productImages) {
  productImages.map((img) => {
    const newImg = img.split(",");

    imagesCarousel.push(newImg[0]);
  });
}

const resolvers = {
  Upload: GraphQLUpload,
  Query: {
    getUser: async (_parent, { id }, _context, _info) => {
      return await User.findById(id);
    },

    getMyProducts: async (parent, args, _context, info) => {
      const { offset, limit } = args.myproductQuery;
      if (_context.validAccessToken) {
        const sellerEmail = _context.email;
        try {
          const totalItems = await Product.find({
            sellerEmail,
          }).countDocuments();
          const result = await Product.find({ sellerEmail })
            .sort({ createdAt: -1 })
            .skip(((offset || 1) - 1) * (limit || 3))
            .limit(limit || 3);
          const products = {
            product: result,
            totalItems: totalItems,
          };
          return products;
        } catch (err) {
          throw new Error(err);
        }
      } else {
        throw new Error("You are not authorised to make this operation");
      }
    },

    getAvailableProducts: async (parent, args, _context, info) => {
      const { offset, limit } = args.pagination;
      try {
        const totalItems = await Product.find({
          availableQuantity: { $gte: 1 },
        }).countDocuments();
        const result = await Product.find({ availableQuantity: { $gte: 1 } })
          .sort({ createdAt: -1 })
          .skip(((offset || 1) - 1) * (limit || 3))
          .limit(limit || 3);
        const products = {
          product: result,
          totalItems: totalItems,
        };
        return products;
      } catch (err) {
        throw new Error(err);
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
          const token = jwt.sign(
            {
              email: user.email,
              userId: user._id.toString(),
              privilege: user.privilegeLevel,
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
      if (context.validAccessToken) {
        const {
          category,
          description,
          price,
          title,
          minOrder,
          sellerCountry,
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
            sellerCountry,
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

    updateProduct: async (parent, args, context, info) => {
      const {
        id,
        category,
        description,
        price,
        title,
        minOrder,
        sellerLocation,
        sellerEmail,
        furtherDetails,
        availableQuantity,
        discount,
        promoStartDate,
        promoEndDate,
        images,
      } = args.product;
      try {
        if (context.validAccessToken) {
          let newImages = [];
          const oldProduct = await Product.findById(id);
          const oldImages = oldProduct.images;
          if (images.length > 0) {
            newImages = oldImages.concat(images);
          } else {
            newImages = images;
          }
          if (
            oldProduct.sellerEmail === context.email ||
            context.userStatus === "admin"
          ) {
            const product = await Product.findByIdAndUpdate(
              id,
              {
                category,
                description,
                price,
                title,
                minOrder,
                sellerLocation,
                sellerEmail,
                furtherDetails,
                availableQuantity,
                discount,
                promoStartDate,
                promoEndDate,
                images: newImages,
              },
              { new: true }
            );
            return product;
          } else {
            throw new Error("You are not authorized to make this operation");
          }
        } else {
          throw new Error("You are not authorized to make this operation");
        }
      } catch (error) {
        throw new Error(error);
      }
    },
    deleteProduct: async (parent, args, context, info) => {
      const { id } = args;
      if (context.validAccessToken) {
        try {
          const product = await Product.findById(id);
          if (
            product.sellerEmail === context.email ||
            context.userStatus === "admin"
          ) {
            await transformImagePath(product.images);
            const delResults = await deleteObjects(imagesCarousel);
            if (delResults.result.Errors.length === 0) {
              await Product.findByIdAndDelete(id);
              return "Product was successfully deleted";
            }
          } else {
            throw new Error("You are not authorized to make this operation");
          }
        } catch (err) {
          throw new Error(err);
        }
      } else {
        throw new Error("You are not authorized to make this operation");
      }
    },
  },
};

module.exports = resolvers;
