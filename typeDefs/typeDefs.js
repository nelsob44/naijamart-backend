const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type User {
    id: ID
    firstName: String
    lastName: String
    email: String
    password: String
    phoneNumber: String
    country: String
    city: String
    address: String
    isVerified: Boolean
  }

  type Product {
    category: String!
    description: String!
    image: [String]
    price: Float!
    title: String!
    minOrder: Float!
    sellerLocation: String!
    verifiedSeller: Boolean!
    furtherDetails: String
    discount: Float
    reviews: Float
    promoEndDate: String
    promoStartDate: String
  }

  type Query {
    getUser(id: ID): User
  }

  type Token {
    accessToken: String!
    email: String!
    firstName: String!
    userId: String!
    privilege: String!
  }

  input ProductInput {
    category: String!
    description: String!
    image: [String]!
    price: Float!
    title: String!
    minOrder: Float
    sellerLocation: String!
    discount: Float!
    promoStartDate: String
    promoEndDate: String
    furtherDetails: String
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
  }

  input AuthInput {
    email: String!
    password: String!
  }

  type Mutation {
    createUser(user: UserInput): User
    deleteUser(id: ID): String
    updateUser(id: ID, user: UserInput): User

    authenticateUser(user: AuthInput): Token
    refresh: String
    addProduct(product: ProductInput): Product
  }
`;

module.exports = typeDefs;
