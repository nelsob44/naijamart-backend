const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const handlebars = require("handlebars");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const path = require("path");
const User = require("../models/User.model");
const Product = require("../models/Product.model");
const Payment = require("../models/Payment.model");
const { AuthenticationError } = require("apollo-server-errors");
const { GraphQLUpload, graphqlUploadExpress } = require("graphql-upload");
const { deleteObjects } = require("../s3");
const { sendEmail } = require("../utilities/email");
const { updateQuantity } = require("../utilities/quantity-update");
const guid = require("guid");
const emailTemplateSource = fs.readFileSync(
  path.join(__dirname, "../views", "reset-password.html"),
  "utf8"
);
const template = handlebars.compile(emailTemplateSource);

const emailTemplateSourceWelcome = fs.readFileSync(
  path.join(__dirname, "../views", "home.html"),
  "utf8"
);
const templateWelcome = handlebars.compile(emailTemplateSourceWelcome);

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
    getUser: async (_parent, { userId }, _context, _info) => {
      if (_context.validAccessToken) {
        try {
          const user = await User.findById(userId);
          return user;
        } catch (err) {
          throw new Error(err);
        }
      }
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

      const newFirstName = firstName && firstName.replace(/(<([^>]+)>)/gi, "");
      const newlastName = lastName && lastName.replace(/(<([^>]+)>)/gi, "");
      const newemail = email && email.replace(/(<([^>]+)>)/gi, "");
      const newphoneNumber =
        phoneNumber & phoneNumber.replace(/(<([^>]+)>)/gi, "");
      const newcountry = country && country.replace(/(<([^>]+)>)/gi, "");
      const newcity = city && city.replace(/(<([^>]+)>)/gi, "");
      const newaddress = address && address.replace(/(<([^>]+)>)/gi, "");
      const user = await User.findOne({ email });
      try {
        if (!user) {
          const hashedPassword = await bcrypt.hash(password, 12);
          const newUser = new User({
            firstName: newFirstName,
            lastName: newlastName,
            email: newemail,
            password: hashedPassword,
            phoneNumber: newphoneNumber,
            country: newcountry,
            city: newcity,
            address: newaddress,
          });
          const user = await newUser.save();
          //Send email
          const url =
            process.env.CLIENT +
            "/auth/verify-account?userId=" +
            user._id.toString();
          const htmlToSend = templateWelcome({
            url,
            name: user.firstName,
          });
          const messageData = {
            from: "Malamino <admin@malamino.com>",
            to: email,
            subject: "Welcome",
            html: htmlToSend,
          };
          sendEmail(messageData);

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
    sendResetLink: async (parent, args, context, info) => {
      const { email } = args;
      try {
        const user = await User.findOne({ email });
        if (user) {
          const userId = user._id.toString();
          const resetTokenGuid = guid.raw();
          const resetPasswordToken = encodeURIComponent(resetTokenGuid);
          await User.findByIdAndUpdate(userId, {
            resetPasswordToken,
          });
          //Send email
          const url =
            process.env.CLIENT +
            "/auth/response-reset?token=" +
            resetPasswordToken;
          const htmlToSend = template({
            url,
            name: user.firstName,
          });
          const messageData = {
            from: "Malamino <admin@malamino.com>",
            to: email,
            subject: "Reset Password",
            html: htmlToSend,
          };
          sendEmail(messageData);

          return "Check your email to click on the link to create your new password!";
        } else {
          throw new Error("User not found");
        }
      } catch (err) {
        throw new Error(err);
      }
    },
    resendVerification: async (parent, args, context, info) => {
      const { userId } = args;
      try {
        const user = await User.findById(userId);
        if (user) {
          const email = user.email;
          //Send email
          const url =
            process.env.CLIENT +
            "/auth/verify-account?userId=" +
            userId.toString();
          const htmlToSend = templateWelcome({
            url,
            name: user.firstName,
          });
          const messageData = {
            from: "Malamino <admin@malamino.com>",
            to: email,
            subject: "Welcome",
            html: htmlToSend,
          };
          sendEmail(messageData);

          return "Check your email to click on the link to complete your account verification!";
        } else {
          throw new Error("User not found");
        }
      } catch (err) {
        throw new Error(err);
      }
    },
    updateUser: async (parent, args, context, info) => {
      if (context.validAccessToken) {
        try {
          const { id } = args;
          const {
            firstName,
            lastName,
            password,
            phoneNumber,
            country,
            city,
            address,
            profilePic,
          } = args.user;
          const hashedPassword = password && (await bcrypt.hash(password, 12));
          const newFirstName =
            firstName && firstName.replace(/(<([^>]+)>)/gi, "");
          const newlastName = lastName && lastName.replace(/(<([^>]+)>)/gi, "");
          const newphoneNumber =
            phoneNumber && phoneNumber.replace(/(<([^>]+)>)/gi, "");
          const newcountry = country && country.replace(/(<([^>]+)>)/gi, "");
          const newcity = city && city.replace(/(<([^>]+)>)/gi, "");
          const newaddress = address && address.replace(/(<([^>]+)>)/gi, "");
          let newProfilePic = [];
          let newPassword = "";
          const oldUser = await User.findById(id);
          if (oldUser) {
            const oldPic = oldUser.profilePic;
            if (profilePic.length > 0) {
              newProfilePic = profilePic;
              await deleteObjects(oldPic);
            } else {
              newProfilePic = oldPic;
            }
            if (password) {
              newPassword = hashedPassword;
            } else {
              newPassword = oldUser.password;
            }
            const user = await User.findByIdAndUpdate(
              id,
              {
                firstName: newFirstName,
                lastName: newlastName,
                password: newPassword,
                phoneNumber: newphoneNumber,
                country: newcountry,
                city: newcity,
                address: newaddress,
                profilePic: newProfilePic,
              },
              { new: true }
            );
            return user;
          } else {
            throw new Error("User not found");
          }
        } catch (err) {
          throw new Error(err);
        }
      } else {
        throw new AuthenticationError("Invalid credentials!");
      }
    },
    changePassword: async (parent, args, context, info) => {
      const { email, password, resetPasswordToken } = args.user;
      try {
        const user = await User.findOne({ email, resetPasswordToken });
        if (user) {
          const userId = user._id.toString();
          const hashedPassword = await bcrypt.hash(password, 12);

          await User.findByIdAndUpdate(
            userId,
            {
              password: hashedPassword,
              resetPasswordToken: "",
            },
            { new: true }
          );

          return "Password reset was successful. Please login with new password.";
        } else {
          throw new Error("User not found");
        }
      } catch (err) {
        throw new Error(err);
      }
    },
    authenticateUser: async (parent, args, context, info) => {
      const { email, password } = args.user;
      const user = await User.findOne({ email });
      try {
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
                isVerified: user.isVerified,
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
              isVerified: user.isVerified,
            };
          }
        } else {
          throw new Error("User not found");
        }
      } catch (err) {
        throw new Error(err);
      }
    },
    verifyUser: async (parent, args, context, info) => {
      const { userId } = args;
      const user = await User.findById(userId);
      try {
        if (user) {
          await User.findByIdAndUpdate(userId, {
            isVerified: true,
          });
          return "Your account has been successfully verified.";
        } else {
          throw new Error("User not found");
        }
      } catch (err) {
        throw new Error(err);
      }
    },
    addProduct: async (parent, args, context, info) => {
      console.log("got here now validAccessToken ", context?.validAccessToken);
      if (context.validAccessToken && context.isVerified) {
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
          videoLink,
          images,
        } = args.product;
        const newcategory = category && category.replace(/(<([^>]+)>)/gi, "");
        const newdescription =
          description && description.replace(/(<([^>]+)>)/gi, "");
        const newtitle = title && title.replace(/(<([^>]+)>)/gi, "");
        const newsellerCountry =
          sellerCountry && sellerCountry.replace(/(<([^>]+)>)/gi, "");
        const newsellerLocation =
          sellerLocation && sellerLocation.replace(/(<([^>]+)>)/gi, "");
        const newfurtherDetails =
          furtherDetails && furtherDetails.replace(/(<([^>]+)>)/gi, "");
        const newpromoStartDate =
          promoStartDate && promoStartDate.replace(/(<([^>]+)>)/gi, "");
        const newpromoEndDate =
          promoEndDate && promoEndDate.replace(/(<([^>]+)>)/gi, "");
        const newvideoLink = videoLink.replace(/(<([^>]+)>)/gi, "");
        try {
          const product = new Product({
            category: newcategory,
            description: newdescription,
            price,
            title: newtitle,
            minOrder,
            sellerCountry: newsellerCountry,
            sellerLocation: newsellerLocation,
            sellerEmail: context.email,
            furtherDetails: newfurtherDetails,
            availableQuantity,
            discount,
            promoStartDate: newpromoStartDate,
            promoEndDate: newpromoEndDate,
            videoLink: newvideoLink,
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
    checkPaymentEligibility: async (parent, args, context, info) => {
      if (context.validAccessToken && context.isVerified) {
        const {
          amount,
          purpose,
          transactionReference,
          paymentFrom,
          paymentTo,
        } = args.payment;
        try {
          const itemsToPurchase = JSON.parse(purpose);
          const result = await updateQuantity(
            itemsToPurchase,
            context.email,
            "pre-pay-check"
          );
          if (result.length > 0) {
            return result;
          } else {
            return ["Success"];
          }
        } catch (err) {
          throw new Error(err);
        }
      } else {
        throw new AuthenticationError(
          "You are not authorized to make this operation"
        );
      }
    },
    makePayment: async (parent, args, context, info) => {
      if (context.validAccessToken && context.isVerified) {
        const {
          amount,
          purpose,
          transactionReference,
          paymentFrom,
          paymentTo,
        } = args.payment;
        try {
          const payment = new Payment({
            amount,
            purpose,
            transactionReference,
            paymentFrom,
            paymentTo,
          });
          await payment.save();
          return payment;
        } catch (err) {
          throw new Error(err);
        }
      } else {
        throw new AuthenticationError(
          "You are not authorized to make this operation"
        );
      }
    },
    completePayment: async (parent, args, context, info) => {
      const { id, transactionReference } = args;
      try {
        if (context.validAccessToken && context.isVerified) {
          const incompletePayment = await Payment.findOne({
            id,
            transactionReference,
          });
          if (incompletePayment) {
            const transactionDetails = JSON.parse(incompletePayment.purpose);
            const result = await updateQuantity(
              transactionDetails,
              context.email,
              "complete-transaction",
              id
            );
            console.log({ result });
            const payment = await Payment.findByIdAndUpdate(
              id,
              {
                isCompleteTransaction: true,
              },
              { new: true }
            );
            return payment;
          } else {
            throw new Error(
              "You are not authorized to make this operation due to wrong parameters"
            );
          }
        } else {
          throw new Error("You are not authorized to make this operation");
        }
      } catch (error) {
        throw new Error(error);
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
        sellerCountry,
        sellerLocation,
        sellerEmail,
        furtherDetails,
        availableQuantity,
        discount,
        promoStartDate,
        promoEndDate,
        videoLink,
        images,
      } = args.product;
      try {
        if (context.validAccessToken && context.isVerified) {
          const newcategory = category && category.replace(/(<([^>]+)>)/gi, "");
          const newdescription =
            description && description.replace(/(<([^>]+)>)/gi, "");
          const newtitle = title && title.replace(/(<([^>]+)>)/gi, "");
          const newsellerCountry =
            sellerCountry && sellerCountry.replace(/(<([^>]+)>)/gi, "");
          const newsellerLocation =
            sellerLocation && sellerLocation.replace(/(<([^>]+)>)/gi, "");
          const newfurtherDetails =
            furtherDetails && furtherDetails.replace(/(<([^>]+)>)/gi, "");
          const newpromoStartDate =
            promoStartDate && promoStartDate.replace(/(<([^>]+)>)/gi, "");
          const newpromoEndDate =
            promoEndDate && promoEndDate.replace(/(<([^>]+)>)/gi, "");
          const newvideoLinkString =
            videoLink && videoLink.replace(/(<([^>]+)>)/gi, "");
          let newImages = [];
          let newVideoLink = "";
          const oldProduct = await Product.findById(id);
          const oldImages = oldProduct.images;
          const oldVideoLink = oldProduct.videoLink;
          if (newvideoLinkString !== "" && newvideoLinkString !== null) {
            newVideoLink = newvideoLinkString;
          } else {
            newVideoLink = oldVideoLink;
          }
          newImages = oldImages.concat(images);
          if (
            oldProduct.sellerEmail === context.email ||
            context.userStatus === "admin"
          ) {
            const product = await Product.findByIdAndUpdate(
              id,
              {
                category: newcategory,
                description: newdescription,
                price,
                title: newtitle,
                minOrder,
                sellerCountry: newsellerCountry,
                sellerLocation: newsellerLocation,
                sellerEmail,
                furtherDetails: newfurtherDetails,
                availableQuantity,
                discount,
                promoStartDate: newpromoStartDate,
                promoEndDate: newpromoEndDate,
                videoLink: newVideoLink,
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
      if (context.validAccessToken && context.isVerified) {
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
