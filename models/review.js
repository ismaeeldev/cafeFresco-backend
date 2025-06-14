const mongoose = require('mongoose');

const reviewSchema = mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product'
    },

    review: {
        type: String,
    },

    rating: {
        type: Number,
        default: 0,
        min: 1,
        max: 5,
    },

})

module.exports = mongoose.model('review', reviewSchema);