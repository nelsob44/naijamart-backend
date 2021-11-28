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

  type Query {
    hello: String

    getUser(id: ID): User
  }

  type Token {
    accessToken: String!
    email: String!
    firstName: String!
    userId: String!
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
  }
`;

module.exports = typeDefs;
