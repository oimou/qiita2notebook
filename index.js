#! /usr/bin/env node
const fs = require("fs");
const url = require("url");
const fetch = require("node-fetch");
const baseUrl = "http://qiita.com/api/v2/items/";
const template = {
	ipynb: {
		"cells": null,
		"metadata": {
			"kernelspec": {
				"display_name": "Python 2",
				"language": "python",
				"name": "python2"
			},
			"language_info": {
				"codemirror_mode": {
					"name": "ipython",
					"version": 2
				},
				"file_extension": ".py",
				"mimetype": "text/x-python",
				"name": "python",
				"nbconvert_exporter": "python",
				"pygments_lexer": "ipython2",
				"version": "2.7.10"
			}
		},
		"nbformat": 4,
		"nbformat_minor": 1
	},
	markdownCell: {
		"cell_type": "markdown",
		"metadata": {},
		"source": null
	},
	codeCell: {
		"cell_type": "code",
		"execution_count": null,
		"metadata": {
			"collapsed": false
		},
		"outputs": [],
		"source": null
	}
};

/**
 *	@param {String} markdown
 *	@return {Object}
 */
function md2ipynb(markdown) {
	const lines = markdown.split("\n");
	const ipynb = Object.assign({}, template.ipynb);

	let isBlock = false;
	let isCodeBlock = false;
	let isMathBlock = false;
	let cell = Object.assign({}, template.markdownCell);

	ipynb.cells = [];
	cell.source = [];

	lines.forEach(line => {
		if (line.match(/^```/)){
			if(isBlock){
				// close block
				if (isCodeBlock) {
					// trim the last line break
					cell.source[cell.source.length - 1] = cell.source[cell.source.length - 1].replace(/\n$/, "");
				} else if (isMathBlock) {
					// do nothing special
				}

				ipynb.cells.push(cell);
				cell = Object.assign({}, template.markdownCell);
				cell.source = [];
				isBlock = false;
				isCodeBlock = false;
				isMathBlock = false;
			} else {
				// open block
				isBlock = true;

				if (!isMathBlock && line.match(/^```(?:py\d?|python\d?|.+\.py)?$/)) {
					ipynb.cells.push(cell);
					cell = Object.assign({}, template.codeCell);
					cell.source = [];
					isCodeBlock = true;
					isMathBlock = false;
				} else if (line.match(/^```math/)) {
					ipynb.cells.push(cell);
					cell = Object.assign({}, template.markdownCell);
					cell.source = [];
					isCodeBlock = false;
					isMathBlock = true;
				}
			}
			// add cell contents
		} else if(isCodeBlock){ 
			cell.source.push(line + "\n");
		} else if (isMathBlock) {
			cell.source.push("$$ " + line + " $$\n");
		} else {
			cell.source.push(line.replace(/^(#+)([^#^\s])/, "$1 $2") + "\n");
		}
	});

	ipynb.cells.push(cell);

	return ipynb;
}

exports.md2ipynb = md2ipynb;

if (require.main === module) {
	const item_id = url.parse(process.argv[2]).pathname.split("/").pop();
	const targetUrl = baseUrl + item_id;

	console.info(`Fetching: ${targetUrl}`);

	fetch(targetUrl)
		.then(res => {
			return res.json();
		})
		.then(json => {
			const title = json.title;
			const markdown = json.body;
			const ipynb = md2ipynb(markdown);
			const content = JSON.stringify(ipynb, null, " ");
			const filename = title + ".ipynb";

			// output to file
			fs.writeFile(filename, content, err => {
				if (err) {
					return console.error(err);
				}

				console.info(`Saved: ${filename}`);
			});
		})
		.catch(err => console.error(err));
}
