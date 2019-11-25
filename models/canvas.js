const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CanvasSchema = new Schema({
  filename: String
},
{
  timestamps: true
});

const Canvas = module.exports = mongoose.model('Canvas', CanvasSchema);
