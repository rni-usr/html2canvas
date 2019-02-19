'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _CanvasRenderer = require('./renderer/CanvasRenderer');

var _CanvasRenderer2 = _interopRequireDefault(_CanvasRenderer);

var _Logger = require('./Logger');

var _Logger2 = _interopRequireDefault(_Logger);

var _Window = require('./Window');

var _Clone = require('./Clone');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getOptions(ownerDocument, config) {
    var defaultView = ownerDocument.defaultView;
    return {
        async: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        imageTimeout: 15000,
        logging: true,
        proxy: null,
        removeContainer: true,
        foreignObjectRendering: false,
        scale: defaultView.devicePixelRatio || 1,
        target: new _CanvasRenderer2.default(config.canvas),
        useCORS: false,
        windowWidth: defaultView.innerWidth,
        windowHeight: defaultView.innerHeight,
        scrollX: defaultView.pageXOffset,
        scrollY: defaultView.pageYOffset
    };
}

var html2canvas = function html2canvas(element, conf) {
    var config = conf || {};
    var logger = new _Logger2.default(typeof config.logging === 'boolean' ? config.logging : true);
    logger.log('html2canvas ' + "$npm_package_version");

    var isCollectionPassed = Object.prototype.toString.call(element) === '[object NodeList]' || Object.prototype.toString.call(element) === '[object HTMLCollection]';

    if (!Array.isArray(element) && !isCollectionPassed) {
        if (process.env.NODE_ENV !== 'production' && typeof config.onrendered === 'function') {
            logger.error('onrendered option is deprecated, html2canvas returns a Promise with the canvas as the value');
        }

        var ownerDocument = element.ownerDocument;
        if (!ownerDocument) {
            return Promise.reject('Provided element is not within a Document');
        }

        var defaultOptions = getOptions(ownerDocument, config);
        var result = (0, _Window.renderElement)(element, _extends({}, defaultOptions, config), logger);

        if (process.env.NODE_ENV !== 'production') {
            return result.catch(function (e) {
                logger.error(e);
                throw e;
            });
        }
        return result;
    } else {
        if (process.env.NODE_ENV !== 'production' && typeof config.onrendered !== 'function') {
            logger.error('onrendered option must be provided on rendering multiple elements');
        }
        var elements = Array.prototype.slice.call(element);
        for (var i = 0; i < elements.length; i++) {
            if (!elements[i].ownerDocument) {
                return Promise.reject('Provided element is not within a Document');
            }
        }

        var _defaultOptions = getOptions(elements[0].ownerDocument, config);
        var options = _extends({}, _defaultOptions, config);

        var cloner = void 0,
            iFrameContainerRef = void 0;
        var _removeContainer = elements.length > 1 ? false : options.removeContainer;
        var _result = (0, _Window.renderElement)(elements[0], _extends({}, options, { removeContainer: _removeContainer }), logger, function (c, iframe) {
            cloner = c;
            iFrameContainerRef = iframe;
        }).then(function (canvas) {
            var chain = null;

            options.onrendered(canvas) || Promise.reject('Rendering was stopped by request');
            chain = Promise.resolve(1);

            var _loop = function _loop(_i) {
                var removeContainer = _i < elements.length - 1 ? false : options.removeContainer;
                var idx = _i;
                chain = chain.then(function (canvases) {
                    return (0, _Window.renderElement)(elements[idx], _extends({}, options, { removeContainer: removeContainer }), logger, undefined, cloner, iFrameContainerRef).then(function (canvas) {
                        return options.onrendered(canvas) ? canvases++ : Promise.reject('Rendering was stopped by request');
                    });
                });
            };

            for (var _i = 1; _i < elements.length; _i++) {
                _loop(_i);
            }
            return chain;
        });

        if (process.env.NODE_ENV !== 'production') {
            return _result.catch(function (e) {
                logger.error(e);
                throw e;
            });
        }
        return _result;
    }
};

html2canvas.CanvasRenderer = _CanvasRenderer2.default;

module.exports = html2canvas;