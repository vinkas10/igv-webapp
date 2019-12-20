import { Utils, FileUtils, GoogleUtils, GoogleFilePicker } from '../../node_modules/igv-widgets/dist/igv-widgets.js';
import { DomUtils } from '../../node_modules/igv-ui/dist/igv-ui.js';
class FileLoad {
    constructor({ localFileInput, dropboxButton, googleEnabled, googleDriveButton }) {

        localFileInput.addEventListener('change', async () => {

            if (true === FileLoad.isValidLocalFileInput(localFileInput)) {
                await this.loadPaths( Array.from(localFileInput.files) );
                localFileInput.value = '';
            }

        });

        dropboxButton.addEventListener('click', () => {

            const config =
                {
                    success: dbFiles => this.loadPaths( dbFiles.map(dbFile => dbFile.link) ),
                    cancel: () => {},
                    linkType: 'preview',
                    multiselect: true,
                    folderselect: false,
                };

            Dropbox.choose( config );

        });


        if (false === googleEnabled) {
            DomUtils.hide(googleDriveButton.parentElement);
        }

        if (true === googleEnabled && googleDriveButton) {

            googleDriveButton.addEventListener('click', () => {

                GoogleFilePicker.createDropdownButtonPicker(true, responses => {

                    const paths = responses
                        .map(({ name, url: google_url }) => {
                            return { filename: name, name, google_url };
                        });

                    this.loadPaths(paths);
                });

            });

        }

    }

    async loadPaths(paths) {
        console.log('FileLoad: loadPaths(...)');
    }

    async processPaths(paths) {

        let tmp = [];
        let googleDrivePaths = [];
        for (let path of paths) {

            if (FileUtils.isFilePath(path)) {
                tmp.push(path);
            } else if (undefined === path.google_url && path.includes('drive.google.com')) {
                const fileInfo = await GoogleUtils.getDriveFileInfo(path);
                googleDrivePaths.push({ filename: fileInfo.name, name: fileInfo.name, google_url: path});
            } else {
                tmp.push(path);
            }
        }

        return tmp.concat(googleDrivePaths);

    }

    static categorizePaths(paths) {

    }

    static isValidLocalFileInput(input) {
        return (input.files && input.files.length > 0);
    }

    static createDataPathDictionary(paths) {

        return paths
            .filter(path => Utils.isKnownFileExtension( FileUtils.getExtension(path) ))
            .reduce((accumulator, path) => {
                accumulator[ FileUtils.getFilename(path) ] = (path.google_url || path);
                return accumulator;
            }, {});

    }

    static createIndexPathCandidateDictionary(paths) {

        return paths
            .filter(path => Utils.isValidIndexExtension( FileUtils.getExtension(path) ))
            .reduce((accumulator, path) => {
                accumulator[ FileUtils.getFilename(path) ] = (path.google_url || path);
                return accumulator;
            }, {});

    }

    static getIndexURL(indexValue) {

        if (indexValue) {

            if        (indexValue[ 0 ]) {
                return indexValue[ 0 ].path;
            } else if (indexValue[ 1 ]) {
                return indexValue[ 1 ].path;
            } else {
                return undefined;
            }

        } else {
            return undefined;
        }

    }

    static getIndexPaths(dataPathNames, indexPathCandidates) {

        // add info about presence and requirement (or not) of an index path
        const list = Object.keys(dataPathNames)
            .map(function (dataPathName) {
                let indexObject;

                // assess the data files need/requirement for index files
                indexObject  = Utils.getIndexObjectWithDataName(dataPathName);

                // identify the presence/absence of associated index files
                for (let p in indexObject) {
                    if (indexObject.hasOwnProperty(p)) {
                        indexObject[ p ].missing = (undefined === indexPathCandidates[ p ]);
                    }
                }

                return indexObject;
            })
            .filter(function (indexObject) {

                // prune optional AND missing index files
                if (1 === Object.keys(indexObject).length) {

                    let obj;

                    obj = indexObject[ Object.keys(indexObject)[ 0 ] ];
                    if( true === obj.missing &&  true === obj.isOptional) {
                        return false;
                    } else if (false === obj.missing && false === obj.isOptional) {
                        return true;
                    } else if ( true === obj.missing && false === obj.isOptional) {
                        return true;
                    } else /*( false === obj.missing && true === obj.isOptional)*/ {
                        return true;
                    }

                } else {
                    return true;
                }

            });

        return list.reduce(function(accumulator, indexObject) {

            for (let key in indexObject) {

                if (indexObject.hasOwnProperty(key)) {
                    let value;

                    value = indexObject[ key ];

                    if (undefined === accumulator[ value.data ]) {
                        accumulator[ value.data ] = [];
                    }

                    accumulator[ value.data ].push(((false === value.missing) ? { name: key, path: indexPathCandidates[ key ] } : undefined));
                }
            }

            return accumulator;
        }, {});

    }

    static dataPathIsMissingIndexPath(dataName, indexPaths) {
        let status,
            aa;

        // if index for data is not in indexPaths it has been culled
        // because it is optional AND missing
        if (undefined === indexPaths[ dataName ]) {

            status = false;
        }

        else if (indexPaths && indexPaths[ dataName ]) {

            aa = indexPaths[ dataName ][ 0 ];
            if (1 === indexPaths[ dataName ].length) {
                status = (undefined === aa);
            } else /* BAM Track with two naming conventions */ {
                let bb;
                bb = indexPaths[ dataName ][ 1 ];
                if (aa || bb) {
                    status = false
                } else {
                    status = true;
                }
            }

        } else {
            status = true;
        }

        return status;

    }

    static assessErrorStatus(dataPaths, indexPaths, indexPathNamesLackingDataPaths) {

        let errorStrings = [];

        for (let key of Object.keys(dataPaths)) {
            if (true === FileLoad.dataPathIsMissingIndexPath(key, indexPaths)) {
                errorStrings.push(`Index file missing for ${ key }`);
            }
        }

        for (let name of indexPathNamesLackingDataPaths) {
            errorStrings.push(`Data file is missing for ${ name }`);
        }

        return errorStrings.length > 0 ? errorStrings.join(' ') : undefined;
    }

}

export default FileLoad;