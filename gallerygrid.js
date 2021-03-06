/**
 * gallerygrid.js
 * A simple and lightweight picture gallery grid layouter
 *
 * Copyright (c) 2015, 2016 Mario Guggenberger <mg@protyposis.net>
 * Released under the MIT license: https://opensource.org/licenses/MIT
 */

var GalleryGrid = function (container, options) {
    'use strict';

    // Reuse existing jQuery and require only if not available
    var $ = jQuery || require('jquery');

    var defaultOptions = {
        border: 0,
        targetHeight: 250,
        minWidth: 0, // minimum width for which the gallery grid layout will be generated
        updateOnResize: true, // automatically update the grid when the window resizes
        itemSelector: 'img' // the grid items to resize for the grid, most usually an image tag
    };

    container = $(container); // convert container to jQuery object
    this.container = container; // make container available from outside

    options = $.extend(defaultOptions, options);
    this.options = options; // make options accessible from outside

    var layoutWidth = container.innerWidth();

    var setSizePrevRowCache = null; // Required for computation of last incomplete row

    var setSize = function (row, targetWidth, targetHeight, incompleteRow) {
        var totalWidth = 0;
        var rowWithSize = [];

        // Calculate target sizes for row elements
        $.each(row, function(i, entry) {
            var scalingFactor = entry.height / targetHeight;
            entry.width = Math.round(entry.width / scalingFactor);
            entry.height = Math.round(targetHeight);

            totalWidth += entry.width + 2 * options.border;
            rowWithSize.push(entry);
        });

        // Adjust the widths element by element and pixel by pixel until the total width is the target width
        var widthOffset = targetWidth - totalWidth;
        if(widthOffset && !incompleteRow) {
            var numEntries = rowWithSize.length;
            $.each(rowWithSize, function (i, entry) {
                var adjustment = Math.ceil(widthOffset / (numEntries - i));
                entry.width += adjustment;
                widthOffset -= adjustment;
            });
        }

        // When we have an incomplete row at the end with less elements than the previous row,
        // then chances are that it contains pictures of the same size which we can width-adjust to perfectly
        // fit to the previous row. Without width adjustment, pictures could be off from the above row by a
        // few pixels which does not look nice and destroys the clean grid look.
        var fitIncompleteRow = incompleteRow && setSizePrevRowCache && rowWithSize.length < setSizePrevRowCache.length;
        // // The max width offset from the above picture for fitting. When a picture is off by more,
        // it is probably of different size and does not need to be fit.
        var fitIncompleteRowAllowedOffset = 3;

        // Apply the calculated sizes to the elements
        $.each(rowWithSize, function(i, entry) {
            if(fitIncompleteRow) {
                if(Math.abs(setSizePrevRowCache[i].width - entry.width) <= fitIncompleteRowAllowedOffset) {
                    entry.width = setSizePrevRowCache[i].width;
                } else {
                    // If a picture does not fit to its neighbor above, we can stop trying to fit the row because
                    // it is most probably different anyway (an exception would be if a picture span multiple pictures
                    // from above [or vice versa] and the next one is again just off a few pixels from the grid, but
                    // this case is much harder to detect and ignored for now).
                    fitIncompleteRow = false;
                }
            }
            $(options.itemSelector, entry.element).css({
                'width': entry.width + 'px',
                'height': entry.height + 'px'
            });
        });

        setSizePrevRowCache = rowWithSize;
    };

    var apply = function () {
        var row = [];
        var rowWidth = 0;
        var fittedRowHeight = 0, prevFittedRowHeight = 0;
        var w = 0;
        var h = 0;

        container.children().each(function (i, element) {
            // Get the item to resize
            var item = $(options.itemSelector, element);
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
            w = w * (options.targetHeight / h); // scale width to targetHeight
            rowWidth += w + 2 * options.border;
            fittedRowHeight = layoutWidth / rowWidth * options.targetHeight;

            if(fittedRowHeight < options.targetHeight) {
                setSize(row, layoutWidth, fittedRowHeight, false);

                // Begin a new row
                row.length = 0;
                rowWidth = 0;
                prevFittedRowHeight = fittedRowHeight;
            }
        });

        // Resize last incomplete row
        if(row.length > 0) {
            // Set the height of the last incomplete row to the same height as the previous row to get a more homogeneous look
            setSize(row, layoutWidth, prevFittedRowHeight === 0 ? options.targetHeight : prevFittedRowHeight, true);
        }
    };

    var clear = function () {
        container.find(options.itemSelector).css({
            'width': '',
            'height': ''
        });
    };

    var update = function (force) {
        force = force || false;
        var newWidth = container.innerWidth();
        if (newWidth < options.minWidth) {
            if(layoutWidth >= options.minWidth) {
                clear();
            }
            return;
        }

        // Test if the gallery width has noticeably changed
        if (force || newWidth !== layoutWidth) {
            layoutWidth = newWidth;
            apply();
        }
    };

    this.apply = function() {
        if(layoutWidth >= options.minWidth) {
            apply();
        }
    };

    this.update = function(force) {
        update(force);
    };

    this.clear = function() {
        clear();
    };

    // Hook the window resize event to update the grid
    $(window).resize(function () {
        if(options.updateOnResize) {
            update();
        }
    });
};

// Export to CommonJs (Node, Browserify)
module.exports = GalleryGrid;
