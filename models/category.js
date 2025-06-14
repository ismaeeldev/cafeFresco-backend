const mongoose = require('mongoose');

const categorySchema = mongoose.Schema({
    title: String,
    image: {
        type: String,
        default: '',
    },
    description: String,
})

module.exports = mongoose.model('category', categorySchema);




