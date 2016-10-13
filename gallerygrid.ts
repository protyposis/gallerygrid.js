/**
 * gallerygrid.js
 * A simple and lightweight picture gallery grid layouter
 *
 * Copyright (c) 2015, 2016 Mario Guggenberger <mg@protyposis.net>
 * Released under the MIT license: https://opensource.org/licenses/MIT
 */

declare var jQuery: any
declare var require: any

module GalleryGrid {

    export interface Options {
        border?: number;
        targetHeight?: number;
        minWidth?: number;
        updateOnResize?: boolean;
        itemSelector?: string;
    }

    export default class GalleryGrid {
        'use strict';

        private $;
        public container; // make container available from outside
        public options: Options; // make options accessible from outside

        private layoutWidth: number;
        private setSizePrevRowCache = null; // Required for computation of last incomplete row

        constructor(container, options: Options) {

            let defaultOptions : Options = {
                border: 0,
                targetHeight: 250,
                minWidth: 0, // minimum width for which the gallery grid layout will be generated
                updateOnResize: true, // automatically update the grid when the window resizes
                itemSelector: 'img' // the grid items to resize for the grid, most usually an image tag
            };

            this.$ = jQuery || require('jquery');
            this.container = this.$(container); // convert container to jQuery object
            this.options = this.$.extend(defaultOptions, options);

            this.layoutWidth = this.container.innerWidth();

            // Hook the window resize event to update the grid
            this.$(window).resize(function () {
                if(this.options.updateOnResize) {
                    this.update(false);
                }
            });
        }

        private setSize(row, targetWidth, targetHeight, incompleteRow) {
            var totalWidth = 0;
            var rowWithSize = [];

            // Calculate target sizes for row elements
            this.$.each(row, function(i, entry) {
                var scalingFactor = entry.height / targetHeight;
                entry.width = Math.round(entry.width / scalingFactor);
                entry.height = Math.round(targetHeight);

                totalWidth += entry.width + 2 * this.options.border;
                rowWithSize.push(entry);
            });

            // Adjust the widths element by element and pixel by pixel until the total width is the target width
            var widthOffset = targetWidth - totalWidth;
            if(widthOffset && !incompleteRow) {
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
            this.$.each(rowWithSize, function(i, entry) {
                if(fitIncompleteRow) {
                    if(Math.abs(this.setSizePrevRowCache[i].width - entry.width) <= fitIncompleteRowAllowedOffset) {
                        entry.width = this.setSizePrevRowCache[i].width;
                    } else {
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
        }

        private applyInternal() {
            var row = [];
            var rowWidth = 0;
            var fittedRowHeight = 0, prevFittedRowHeight = 0;
            var w = 0;
            var h = 0;

            this.container.children().each(function (i, element) {
                // Get the item to resize
                var item = this.$(this.options.itemSelector, element);
                // Skip children that do not contain an item matching the item selector
                if(!item.length) {
                    return true;
                }
                // The data-width and data-height attributes are required to know the image dimensions in advance
                // before the images have been requested and loaded.
                w = item.data('width');
                h = item.data('height');
                // If data attributes are missing, check html5 image attributes naturalWidth/naturalHeight as
                // fallback. They are only available when the images are already loaded though.
                if(w == null) { w = item[0].naturalWidth; }
                if(h == null) { h = item[0].naturalHeight; }

                row.push({
                    element: element,
                    width: w,
                    height: h
                });
                w = w * (this.options.targetHeight / h); // scale width to targetHeight
                rowWidth += w + 2 * this.options.border;
                fittedRowHeight = this.layoutWidth / rowWidth * this.options.targetHeight;

                if(fittedRowHeight < this.options.targetHeight) {
                    this.setSize(row, this.layoutWidth, fittedRowHeight, false);

                    // Begin a new row
                    row.length = 0;
                    rowWidth = 0;
                    prevFittedRowHeight = fittedRowHeight;
                }
            });

            // Resize last incomplete row
            if(row.length > 0) {
                // Set the height of the last incomplete row to the same height as the previous row to get a more homogeneous look
                this.setSize(row, this.layoutWidth, prevFittedRowHeight === 0 ? this.options.targetHeight : prevFittedRowHeight, true);
            }
        }

        public apply() {
            if(this.layoutWidth >= this.options.minWidth) {
                this.applyInternal();
            }
        }

        public update(force = false) {
            force = force || false;
            var newWidth = this.container.innerWidth();
            if (newWidth < this.options.minWidth) {
                if(this.layoutWidth >= this.options.minWidth) {
                    this.clear();
                }
                return;
            }

            // Test if the gallery width has noticeably changed
            if (force || newWidth !== this.layoutWidth) {
                this.layoutWidth = newWidth;
                this.apply();
            }
        }

        public clear() {
            this.container.find(this.options.itemSelector).css({
                'width': '',
                'height': ''
            });
        }
    }
}
