const jwt = require("jsonwebtoken");
const { deleteObjects } = require("../s3");
const {
  authenticateUser,
  verifyUser,
  getUser,
  createUser,
  deleteUser,
  sendResetLink,
  resendVerification,
  updateUser,
  changePassword,
  getBanksList,
} = require("./users");
const {
  getMyProducts,
  getAvailableProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} = require("./products");
const {
  checkPaymentEligibility,
  makePayment,
  completePayment,
  withdrawToBankBulk,
  withdrawToBankSingle,
} = require("./payments");
const {
  createTransaction,
  completeTransaction,
  getAccountBalance,
  getRecipients,
  transferCredit,
} = require("./accounts");

const {
  getMyOrders,
  releaseFunds,
  updateRegularCommission,
  updatePremiumCommission,
  getCommissions,
  getOrder,
} = require("./orders");

const resolvers = {
  Query: {
    getUser,
    getMyProducts,
    getAvailableProducts,
    getAccountBalance,
    getRecipients,
    getMyOrders,
    getCommissions,
    getOrder,
    getBanksList,
  },

  Mutation: {
    createUser,
    deleteUser,
    sendResetLink,
    resendVerification,
    updateUser,
    changePassword,
    authenticateUser,
    verifyUser,
    addProduct,
    checkPaymentEligibility,
    makePayment,
    completePayment,
    createTransaction,
    completeTransaction,
    transferCredit,
    releaseFunds,
    updateRegularCommission,
    updatePremiumCommission,
    withdrawToBankSingle,
    withdrawToBankBulk,
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
    updateProduct,
    deleteProduct,
  },
};

module.exports = resolvers;
