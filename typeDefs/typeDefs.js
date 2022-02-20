const { gql } = require("apollo-server-express");

const typeDefs = gql`
  scalar Upload

  type User {
    id: ID
    firstName: String
    lastName: String
    email: String
    phoneNumber: String
    country: String
    city: String
    address: String
    isVerified: Boolean
    privilegeLevel: String
    profilePic: [String]
  }

  type Product {
    id: ID
    category: String
    description: String
    videoLink: String
    images: [String]
    price: Float!
    title: String!
    minOrder: Float
    sellerCountry: String
    sellerLocation: String
    sellerEmail: String
    sellerId: String
    verifiedSeller: Boolean
    furtherDetails: String
    availableQuantity: Int
    discount: Float
    reviews: Float
    promoEndDate: String
    promoStartDate: String
  }

  type Order {
    id: ID!
    itemName: String
    unitPrice: Float
    itemQuantity: Int
    amount: Float
    finalAmount: Float
    transactionReference: String
    buyerEmail: String
    sellerEmail: String
    buyerName: String
    sellerName: String
    isPaidFor: Boolean
    isDispatched: Boolean
    isCompleteTransaction: Boolean
    shippingDetails: String
    createdAt: String
  }

  type ProductPaginate {
    product: [Product]
    totalItems: Int
  }

  type OrderPaginate {
    order: [Order]
    totalItems: Int
  }

  type Token {
    accessToken: String!
    email: String!
    firstName: String!
    userId: String!
    privilege: String!
    isVerified: Boolean!
  }

  type Payment {
    id: ID
    amount: Int!
    transactionType: String
    transactionReference: String!
    paymentFrom: String!
    paymentTo: String!
    isCompleteTransaction: Boolean!
    createdAt: String!
  }

  type OutPayment {
    id: ID
    amount: Int
    recepientName: String
    recepientEmail: String
    bankName: String
    bankAccountNumber: Int
    transactionReference: String
    createdAt: String
  }

  type Transaction {
    id: ID!
    amount: Int!
    transactionType: String
    transactionReference: String
    paymentFrom: String
    paymentTo: String
    isCompleteTransaction: Boolean
    createdAt: String
  }

  type File {
    filename: String!
    mimetype: String!
    encoding: String!
  }

  type Account {
    userName: String!
    accountType: String!
    currentBalance: Int!
    lastCreditFrom: String!
    lastPaymentTo: String!
    lastTransactionAmount: Int!
    updatedAt: String!
  }

  type Recipient {
    id: ID!
    userName: String!
    userEmail: String!
  }

  input PaginationInput {
    offset: Int
    limit: Int
  }

  input PaginationInputQuery {
    offset: Int
    limit: Int
    sellerEmail: String
  }

  input ProductInput {
    category: String!
    description: String!
    price: Float!
    title: String!
    minOrder: Float
    sellerCountry: String
    sellerLocation: String
    sellerEmail: String
    furtherDetails: String
    availableQuantity: Int
    discount: Float
    promoStartDate: String
    promoEndDate: String
    videoLink: String
    images: [String]
  }

  input UpdateProductInput {
    id: ID!
    category: String
    description: String
    price: Float
    title: String
    minOrder: Float
    sellerCountry: String
    sellerLocation: String
    sellerEmail: String
    furtherDetails: String
    availableQuantity: Int
    discount: Float
    promoStartDate: String
    promoEndDate: String
    videoLink: String
    images: [String]
  }

  input UserInput {
    firstName: String!
    lastName: String!
    email: String!
    password: String!
    phoneNumber: String
    country: String
    city: String
    address: String
    profilePic: [String]
    bankName: String
    bankAccountNumber: Int
    bankSortCode: Int
  }

  input UpdateUserInput {
    firstName: String
    lastName: String
    password: String
    phoneNumber: String
    country: String
    city: String
    address: String
    profilePic: [String]
  }

  input ResetUserInput {
    email: String!
    password: String!
    resetPasswordToken: String!
  }

  input AuthInput {
    email: String!
    password: String!
  }

  input CompletePaymentInput {
    id: ID!
    transactionReference: String!
  }

  input PaymentInput {
    amount: Int!
    purpose: String
    transactionReference: String!
    paymentFrom: String!
    paymentTo: String!
  }

  input AccountInput {
    amount: Int!
    transactionType: String
    transactionReference: String!
    paymentFrom: String!
    paymentTo: String!
  }

  input TransferInput {
    transferValue: Int!
    recipientEmail: String!
  }

  type Query {
    getMyProducts(myproductQuery: PaginationInputQuery): ProductPaginate
    getAvailableProducts(pagination: PaginationInput): ProductPaginate
    getUser(userId: ID!): User
    getAccountBalance(email: String): Account
    getRecipients(recipientEmail: String!): [Recipient]
    getMyOrders(myOrderQuery: PaginationInput): OrderPaginate
  }

  type Mutation {
    createUser(user: UserInput!): User
    deleteUser(id: ID!): String
    updateUser(id: ID!, user: UpdateUserInput): User
    sendResetLink(email: String!): String
    verifyUser(userId: ID!): String
    resendVerification(userId: ID!): String
    changePassword(user: ResetUserInput): String

    updateProduct(product: UpdateProductInput): Product

    authenticateUser(user: AuthInput): Token
    refresh: String
    addProduct(product: ProductInput): Product
    deleteProduct(id: ID!): String

    makePayment(payment: PaymentInput): Payment
    checkPaymentEligibility(payment: PaymentInput): [String]
    completePayment(id: ID!, transactionReference: String!): Payment

    createTransaction(payment: AccountInput): Transaction
    completeTransaction(id: ID!, transactionReference: String!): Transaction
    transferCredit(transfer: TransferInput): Account
    releaseFunds(orderId: ID!, transactionReference: String!): OutPayment
  }
`;

module.exports = typeDefs;
