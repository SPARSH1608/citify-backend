const mongoose = require('mongoose');
const { Schema } = mongoose;

const PostSchema = new mongoose.Schema(
  {
    title: String,
    summary: String,
    content: String,
    cover: String,
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    support: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

module.exports = new mongoose.model('Post', PostSchema);
