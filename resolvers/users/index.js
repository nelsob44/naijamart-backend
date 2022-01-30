const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const handlebars = require("handlebars");
const User = require("../../models/User.model");
const Account = require("../../models/Account.model");
const { AuthenticationError } = require("apollo-server-errors");
const { sendEmail } = require("../../utilities/email");
const guid = require("guid");

const emailTemplateSource = fs.readFileSync(
  path.join(__dirname, "../../views", "reset-password.html"),
  "utf8"
);
const template = handlebars.compile(emailTemplateSource);

const emailTemplateSourceWelcome = fs.readFileSync(
  path.join(__dirname, "../../views", "home.html"),
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

const authenticateUser = async (parent, args, context, info) => {
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
};

exports.authenticateUser = authenticateUser;

const verifyUser = async (parent, args, context, info) => {
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
};
exports.verifyUser = verifyUser;

const getUser = async (_parent, { userId }, _context, _info) => {
  if (_context.validAccessToken) {
    try {
      const user = await User.findById(userId);
      return user;
    } catch (err) {
      throw new Error(err);
    }
  }
};
exports.getUser = getUser;

const createUser = async (parent, args, context, info) => {
  const {
    firstName,
    lastName,
    email,
    password,
    phoneNumber,
    country,
    city,
    address,
    bankName,
    bankAccountNumber,
    bankSortCode,
  } = args.user;

  const newFirstName = firstName && firstName.replace(/(<([^>]+)>)/gi, "");
  const newlastName = lastName && lastName.replace(/(<([^>]+)>)/gi, "");
  const newemail = email && email.replace(/(<([^>]+)>)/gi, "");
  const newphoneNumber =
    phoneNumber && phoneNumber.replace(/(<([^>]+)>)/gi, "");
  const newcountry = country && country.replace(/(<([^>]+)>)/gi, "");
  const newcity = city && city.replace(/(<([^>]+)>)/gi, "");
  const newaddress = address && address.replace(/(<([^>]+)>)/gi, "");
  const newbankName = bankName && bankName.replace(/(<([^>]+)>)/gi, "");
  const newbankAccountNumber = bankAccountNumber && bankAccountNumber;
  const newbankSortCode = bankSortCode && bankSortCode;
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
        bankName: newbankName,
        bankAccountNumber: newbankAccountNumber,
        bankSortCode: newbankSortCode,
      });
      const user = await newUser.save();

      //create platform account for new user
      const newAccount = new Account({
        userName: newFirstName + " " + newlastName,
        userEmail: newemail,
      });
      const account = await newAccount.save();
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
};
exports.createUser = createUser;

const deleteUser = async (parent, args, context, info) => {
  const { id } = args;
  await User.findByIdAndDelete(id);
  return "User successfully deleted";
};
exports.deleteUser = deleteUser;

const sendResetLink = async (parent, args, context, info) => {
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
        process.env.CLIENT + "/auth/response-reset?token=" + resetPasswordToken;
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
};
exports.sendResetLink = sendResetLink;

const resendVerification = async (parent, args, context, info) => {
  const { userId } = args;
  try {
    const user = await User.findById(userId);
    if (user) {
      const email = user.email;
      //Send email
      const url =
        process.env.CLIENT + "/auth/verify-account?userId=" + userId.toString();
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
};
exports.resendVerification = resendVerification;

const updateUser = async (parent, args, context, info) => {
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
      const newFirstName = firstName && firstName.replace(/(<([^>]+)>)/gi, "");
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
};
exports.updateUser = updateUser;

const changePassword = async (parent, args, context, info) => {
  const { email, password, resetPasswordToken } = args.user;
  try {
    const user = await User.findOne({ email, resetPasswordToken });
    if (user) {
      const userId = user._id.toString();
      const hashedPassword = await bcrypt.hash(password, 12);

      await User.findByIdAndUpdate(
        { id: userId },
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
};
exports.changePassword = changePassword;
