/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
 * Author: Jim Robinson
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import igv from '../node_modules/igv/dist/igv.esm.js';
import { Alert, GenomeFileLoad, FileLoadManager, FileLoadWidget, Utils } from '../node_modules/igv-widgets/dist/igv-widgets.js';
import { loadGenome } from './utils.js';
import { googleEnabled } from "./main.js";

class GenomeLoadController {

    constructor (browser, { $urlModal, genomes, genomeFileLoad }) {

        this.genomes = genomes;

        let config =
            {
                widgetParent: $urlModal.find('.modal-body').get(0),
                dataTitle: 'Genome',
                indexTitle: 'Genome Index',
                mode: 'url',
                fileLoadManager: new FileLoadManager(),
                dataOnly: false,
                doURL: true
            };

        this.urlWidget = new FileLoadWidget(config);

        Utils.configureModal(this.urlWidget, $urlModal.get(0), async fileLoadWidget => {
            await genomeFileLoad.ingestPaths(fileLoadWidget.retrievePaths());
            return true;
        });

    }

    initialize(browser, $dropdown_menu) {

        (async () => {

            try {

                const genomeDictionary = await this.getAppLaunchGenomes();

                if (genomeDictionary) {
                    genomeDropdownLayout({ browser, genomeDictionary, $dropdown_menu });
                }

            } catch (e) {
                Alert.presentAlert(e.message)
            }

        })();

    }

    async getAppLaunchGenomes () {

        if(undefined === this.genomes) {
            return undefined;
        }

        if(Array.isArray(this.genomes)) {
            return buildDictionary(this.genomes);
        } else {

            let response = undefined;
            try {
                response = await fetch(this.genomes);
            } catch (e) {
                Alert.presentAlert(e.message);
            }

            if (response) {
                let json = await response.json();
                return buildDictionary(json);
            }

        }

    }

}

const buildDictionary = array => {

    let dictionary = {};
    if (true === Array.isArray(array)) {

        for (let json of array) {
            dictionary[ json.id ] = json;
        }

    } else {
        dictionary[ array.id ] = array;
    }

    return dictionary;
};

const genomeLoadConfigurator = (browser, { genomes }) => {

    const genomeFileLoadConfig =
        {
            localFileInput: document.getElementById('igv-app-dropdown-local-genome-file-input'),
            dropboxButton: document.getElementById('igv-app-dropdown-dropbox-genome-file-button'),
            googleEnabled,
            googleDriveButton: document.getElementById('igv-app-dropdown-google-drive-genome-file-button'),
            loadHandler: (configuration) => {
                loadGenome(configuration);
            },
            igvxhr: igv.xhr,
            google: igv.google,

        };

    const genomeFileLoad = new GenomeFileLoad(genomeFileLoadConfig);

    return { $urlModal: $('#igv-app-genome-from-url-modal'), genomes, genomeFileLoad }

}

const genomeDropdownLayout = ({ browser, genomeDictionary, $dropdown_menu}) => {

    // discard all buttons preceeding the divider div
    let $divider = $dropdown_menu.find('#igv-app-genome-dropdown-divider');
    $divider.prevAll().remove();

    for (let key in genomeDictionary) {

        if (genomeDictionary.hasOwnProperty(key)) {

            let $button = createButton(genomeDictionary[ key ].name);
            $button.insertBefore($divider);

            $button.data('id', key);

            const str = `click.genome-dropdown.${ key }`;

            $button.on(str, () => {

                const id = $button.data('id');

                if (id !== browser.genome.id) {
                    loadGenome(genomeDictionary[ id ]);
                }

            });

        } // if (...)

    } // for (...)

    function createButton (title) {

        let $button = $('<button>', { class:'dropdown-item', type:'button' });
        $button.text(title);

        return $button;
    }

}

export { genomeLoadConfigurator }

export default GenomeLoadController;

