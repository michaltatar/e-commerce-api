const User = require('../models/User')
const CustomError = require('../errors')
const { StatusCodes } = require('http-status-codes')
const { attachCookiesToResponse, createTokenUser } = require('../utils')

const register = async (req, res) => {
  const { email, name, password } = req.body
  const emailAlreadyExists = await User.findOne({ email })
  if (emailAlreadyExists) {
    throw new CustomError.BadRequestError('E-mail already exists')
  }
  // set first registered user as admin
  const isFirstAccount = (await User.countDocuments({})) === 0
  const role = isFirstAccount ? 'admin' : 'user'

  const user = await User.create({ name, email, password, role })
  const tokenUser = createTokenUser(user)

  attachCookiesToResponse({ res, user: tokenUser })
  res.status(StatusCodes.CREATED).json({ user: tokenUser })
}

const login = async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    throw new CustomError.BadRequestError('Please provide e-mail & password')
  }

  const user = await User.findOne({ email })
  if (!user) {
    throw new CustomError.UnauthenticatedError('Invalid credentials')
  }

  const isPasswordValid = await user.comparePassword(password)
  if (!isPasswordValid) {
    throw new CustomError.UnauthenticatedError('Invalid credentials')
  }

  const tokenUser = createTokenUser(user)

  attachCookiesToResponse({ res, user: tokenUser })
  res.status(StatusCodes.OK).json({ user: tokenUser })
}

const logout = async (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(Date.now()),
  })
  res.status(StatusCodes.OK).json({ msg: 'user logged out' })
}

module.exports = {
  register,
  login,
  logout,
}
