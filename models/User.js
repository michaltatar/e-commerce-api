const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'User name is required'],
    minLength: 3,
    maxLength: 10,
  },
  email: {
    type: String,
    unique: true,
    required: [true, 'E-mail is required'],
    validate: {
      validator: validator.isEmail,
      message: 'Please provide valid e-mail',
    },
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minLength: 6,
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user',
  },
})

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

UserSchema.methods.comparePassword = async function (candidatePassword) {
  const isMatch = await bcrypt.compare(candidatePassword, this.password)
  return isMatch
}

module.exports = mongoose.model('User', UserSchema)
