/* @flow */
'use strict';

import type {RenderTarget} from './Renderer';

import CanvasRenderer from './renderer/CanvasRenderer';
import Logger from './Logger';
import {renderElement} from './Window';
import {DocumentCloner} from './Clone';

export type Options = {
    async: ?boolean,
    allowTaint: ?boolean,
    backgroundColor: string,
    canvas: ?HTMLCanvasElement,
    foreignObjectRendering: boolean,
    ignoreElements?: HTMLElement => boolean,
    imageTimeout: number,
    logging: boolean,
    onclone?: (Document, DocumentCloner, HTMLIFrameElement) => void,
    onrendered?: (DocumentCloner, HTMLIFrameElement) => boolean,
    proxy: ?string,
    removeContainer: ?boolean,
    scale: number,
    target: RenderTarget<*>,
    useCORS: boolean,
    width: number,
    height: number,
    x: number,
    y: number,
    scrollX: number,
    scrollY: number,
    windowWidth: number,
    windowHeight: number
};

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
        target: new CanvasRenderer(config.canvas),
        useCORS: false,
        windowWidth: defaultView.innerWidth,
        windowHeight: defaultView.innerHeight,
        scrollX: defaultView.pageXOffset,
        scrollY: defaultView.pageYOffset
    };
}

function cloneCanvas(oldCanvas) {
    var newCanvas = document.createElement('canvas');
    var context = newCanvas.getContext('2d');
    newCanvas.width = oldCanvas.width;
    newCanvas.height = oldCanvas.height;
    context.drawImage(oldCanvas, 0, 0);
    return newCanvas;
}

const html2canvas = (element: HTMLElement, conf: ?Options): Promise<*> => {
    const config = conf || {};
    const logger = new Logger(typeof config.logging === 'boolean' ? config.logging : true);
    logger.log(`html2canvas ${__VERSION__}`);

    const isCollectionPassed =
        Object.prototype.toString.call(element) === '[object NodeList]' ||
        Object.prototype.toString.call(element) === '[object HTMLCollection]';

    if (!Array.isArray(element) && !isCollectionPassed) {
        if (__DEV__ && typeof config.onrendered === 'function') {
            logger.error(
                `onrendered option is deprecated, html2canvas returns a Promise with the canvas as the value`
            );
        }

        const ownerDocument = element.ownerDocument;
        if (!ownerDocument) {
            return Promise.reject(`Provided element is not within a Document`);
        }

        const defaultOptions = getOptions(ownerDocument, config);
        const result = renderElement(element, {...defaultOptions, ...config}, logger);

        if (__DEV__) {
            return result.catch(e => {
                logger.error(e);
                throw e;
            });
        }
        return result;
    } else {
        if (__DEV__ && !config.resolveCanvases && typeof config.onrendered === 'function') {
            logger.error(
                'onrendered option is not provided, you must use it to get rendered data if resolveCanvases is set to true'
            );
        }
        const elements = Array.prototype.slice.call(element);
        for (let i = 0; i < elements.length; i++) {
            if (!elements[i].ownerDocument) {
                return Promise.reject('Provided element is not within a Document');
            }
        }

        const defaultOptions = getOptions(elements[0].ownerDocument, config);
        const options = {...defaultOptions, ...config};

        let cloner = null,
            iFrameContainerRef = null;
        const removeContainer = elements.length > 1 ? false : options.removeContainer;
        const result = renderElement(
            elements[0],
            {...options, removeContainer},
            logger,
            (c, iframe) => {
                cloner = c;
                iFrameContainerRef = iframe;
            }
        ).then(function(canvas) {
            let chain = null;
            if (options.resolveCanvases) {
                chain = Promise.resolve([cloneCanvas(canvas)]);
            } else {
                options.onrendered(canvas) || Promise.reject('Rendering was stopped by request');
                chain = Promise.resolve(1);
            }
            for (let i = 1; i < elements.length; i++) {
                const removeContainer = i < elements.length - 1 ? false : options.removeContainer;
                const idx = i;
                chain = chain.then(canvases => {
                    return renderElement(
                        elements[idx],
                        {...options, removeContainer},
                        logger,
                        null,
                        cloner,
                        iFrameContainerRef
                    ).then(function(canvas) {
                        if (options.resolveCanvases) {
                            canvases.push(cloneCanvas(canvas));
                            return canvases;
                        } else {
                            return options.onrendered(canvas)
                                ? canvases++
                                : Promise.reject('Rendering was stopped by request');
                        }
                    });
                });
            }
            return chain;
        });

        if (process.env.NODE_ENV !== 'production') {
            return result.catch(function(e) {
                logger.error(e);
                throw e;
            });
        }
        return result;
    }
};

html2canvas.CanvasRenderer = CanvasRenderer;

module.exports = html2canvas;
