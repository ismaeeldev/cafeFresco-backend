const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    image: {
        type: String,
        default: '',
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    discount: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'category'
    },
    featured: {
        type: Boolean,
        default: false,
    },
    newRelease: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    inventory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'inventory',
        required: false
    },

    reviews: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'review',
        }
    ],

    averageRating: {
        type: String,
        default: 0,
    }

});

productSchema.virtual('discountedPrice').get(function () {
    return (this.price * (1 - this.discount / 100)).toFixed(2);
});

// Ensure virtuals are included in JSON response
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('product', productSchema);
