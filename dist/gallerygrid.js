(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.GalleryGrid = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * gallerygrid.js
 * A simple and lightweight picture gallery grid layouter
 *
 * Copyright (c) 2015, 2016 Mario Guggenberger <mg@protyposis.net>
 * Released under the MIT license: https://opensource.org/licenses/MIT
 */
var GalleryGrid;
(function (GalleryGrid_1) {
    var GalleryGrid = (function () {
        function GalleryGrid(container, options) {
            this.setSizePrevRowCache = null; // Required for computation of last incomplete row
            var defaultOptions = {
                border: 0,
                targetHeight: 250,
                minWidth: 0,
                updateOnResize: true,
                itemSelector: 'img' // the grid items to resize for the grid, most usually an image tag
            };
            this.$ = jQuery || require('jquery');
            this.container = this.$(container); // convert container to jQuery object
            this.options = this.$.extend(defaultOptions, options);
            this.layoutWidth = this.container.innerWidth();
            // Hook the window resize event to update the grid
            this.$(window).resize(function () {
                if (this.options.updateOnResize) {
                    this.update(false);
                }
            });
        }
        GalleryGrid.prototype.setSize = function (row, targetWidth, targetHeight, incompleteRow) {
            var totalWidth = 0;
            var rowWithSize = [];
            // Calculate target sizes for row elements
            this.$.each(row, function (i, entry) {
                var scalingFactor = entry.height / targetHeight;
                entry.width = Math.round(entry.width / scalingFactor);
                entry.height = Math.round(targetHeight);
                totalWidth += entry.width + 2 * this.options.border;
                rowWithSize.push(entry);
            });
            // Adjust the widths element by element and pixel by pixel until the total width is the target width
            var widthOffset = targetWidth - totalWidth;
            if (widthOffset && !incompleteRow) {
                var numEntries = rowWithSize.length;
                this.$.each(rowWithSize, function (i, entry) {
                    var adjustment = Math.ceil(widthOffset / (numEntries - i));
                    entry.width += adjustment;
                    widthOffset -= adjustment;
                });
            }
            // When we have an incomplete row at the end with less elements than the previous row,
            // then chances are that it contains pictures of the same size which we can width-adjust to perfectly
            // fit to the previous row. Without width adjustment, pictures could be off from the above row by a
            // few pixels which does not look nice and destroys the clean grid look.
            var fitIncompleteRow = incompleteRow && this.setSizePrevRowCache && rowWithSize.length < this.setSizePrevRowCache.length;
            // // The max width offset from the above picture for fitting. When a picture is off by more,
            // it is probably of different size and does not need to be fit.
            var fitIncompleteRowAllowedOffset = 3;
            // Apply the calculated sizes to the elements
            this.$.each(rowWithSize, function (i, entry) {
                if (fitIncompleteRow) {
                    if (Math.abs(this.setSizePrevRowCache[i].width - entry.width) <= fitIncompleteRowAllowedOffset) {
                        entry.width = this.setSizePrevRowCache[i].width;
                    }
                    else {
                        // If a picture does not fit to its neighbor above, we can stop trying to fit the row because
                        // it is most probably different anyway (an exception would be if a picture span multiple pictures
                        // from above [or vice versa] and the next one is again just off a few pixels from the grid, but
                        // this case is much harder to detect and ignored for now).
                        fitIncompleteRow = false;
                    }
                }
                this.$(this.options.itemSelector, entry.element).css({
                    'width': entry.width + 'px',
                    'height': entry.height + 'px'
                });
            });
            this.setSizePrevRowCache = rowWithSize;
        };
        GalleryGrid.prototype.applyInternal = function () {
            var row = [];
            var rowWidth = 0;
            var fittedRowHeight = 0, prevFittedRowHeight = 0;
            var w = 0;
            var h = 0;
            this.container.children().each(function (i, element) {
                // Get the item to resize
                var item = this.$(this.options.itemSelector, element);
                // Skip children that do not contain an item matching the item selector
                if (!item.length) {
                    return true;
                }
                // The data-width and data-height attributes are required to know the image dimensions in advance
                // before the images have been requested and loaded.
                w = item.data('width');
                h = item.data('height');
                // If data attributes are missing, check html5 image attributes naturalWidth/naturalHeight as
                // fallback. They are only available when the images are already loaded though.
                if (w == null) {
                    w = item[0].naturalWidth;
                }
                if (h == null) {
                    h = item[0].naturalHeight;
                }
                row.push({
                    element: element,
                    width: w,
                    height: h
                });
                w = w * (this.options.targetHeight / h); // scale width to targetHeight
                rowWidth += w + 2 * this.options.border;
                fittedRowHeight = this.layoutWidth / rowWidth * this.options.targetHeight;
                if (fittedRowHeight < this.options.targetHeight) {
                    this.setSize(row, this.layoutWidth, fittedRowHeight, false);
                    // Begin a new row
                    row.length = 0;
                    rowWidth = 0;
                    prevFittedRowHeight = fittedRowHeight;
                }
            });
            // Resize last incomplete row
            if (row.length > 0) {
                // Set the height of the last incomplete row to the same height as the previous row to get a more homogeneous look
                this.setSize(row, this.layoutWidth, prevFittedRowHeight === 0 ? this.options.targetHeight : prevFittedRowHeight, true);
            }
        };
        GalleryGrid.prototype.apply = function () {
            if (this.layoutWidth >= this.options.minWidth) {
                this.applyInternal();
            }
        };
        GalleryGrid.prototype.update = function (force) {
            if (force === void 0) { force = false; }
            force = force || false;
            var newWidth = this.container.innerWidth();
            if (newWidth < this.options.minWidth) {
                if (this.layoutWidth >= this.options.minWidth) {
                    this.clear();
                }
                return;
            }
            // Test if the gallery width has noticeably changed
            if (force || newWidth !== this.layoutWidth) {
                this.layoutWidth = newWidth;
                this.apply();
            }
        };
        GalleryGrid.prototype.clear = function () {
            this.container.find(this.options.itemSelector).css({
                'width': '',
                'height': ''
            });
        };
        return GalleryGrid;
    }());
    exports["default"] = GalleryGrid;
})(GalleryGrid || (GalleryGrid = {}));

},{"jquery":undefined}]},{},[1])(1)
});