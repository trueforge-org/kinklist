var log = function (val, base) {
	return Math.log(val) / Math.log(base);
};

var strToClass = function (str) {
	var className = "";
	str = str.toLowerCase();
	var validChars = "abcdefghijklmnopqrstuvwxyz";
	var newWord = false;
	for (var i = 0; i < str.length; i++) {
		var chr = str[i];
		if (validChars.indexOf(chr) >= 0) {
			if (newWord) chr = chr.toUpperCase();
			className += chr;
			newWord = false;
		} else {
			newWord = true;
		}
	}
	return className;
};

var addCssRule = function (selector, rules) {
	var sheet = document.styleSheets[0];
	if ("insertRule" in sheet) {
		sheet.insertRule(selector + "{" + rules + "}", 0);
	} else if ("addRule" in sheet) {
		sheet.addRule(selector, rules, 0);
	}
};

var kinks = {};
var inputKinks = {};
var colors = {};
var level = {};

$(function () {
	var imgurClientId = "9db53e5936cd02f";
	let previousInput = null;
	let previousOutput = null;
	let debounceTimeout;

function debounce(fn, delay) {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(fn, delay);
}

	inputKinks = {
		$columns: [],
		createCategory: function (name, fields) {
			var $category = $('<div class="kinkCategory">')
				.addClass("cat-" + strToClass(name))
				.data("category", name)
				.append($("<h2>").text(name));

			var $table = $('<table class="kinkGroup">').data("fields", fields);
			var $thead = $("<thead>").appendTo($table);
			for (var i = 0; i < fields.length; i++) {
				$("<th>").addClass("choicesCol").text(fields[i]).appendTo($thead);
			}
			$("<th>").appendTo($thead);
			$("<tbody>").appendTo($table);
			$category.append($table);

			return $category;
		},
		createChoice: function () {
			var $container = $("<div>").addClass("choices");
			var levels = Object.keys(level);
			for (var i = 0; i < levels.length; i++) {
				$("<button>")
					.addClass("choice")
					.addClass(level[levels[i]])
					.data("level", levels[i])
					.data("levelInt", i)
					.attr("title", levels[i])
					.appendTo($container)
					.on("click", function () {
						$container.find("button").removeClass("selected");
						$(this).addClass("selected");
					});
			}
			return $container;
		},
		createKink: function (fields, name) {
			var $row = $("<tr>").data("kink", name).addClass("kinkRow");
			for (var i = 0; i < fields.length; i++) {
				var $choices = inputKinks.createChoice();
				$choices.data("field", fields[i]);
				$choices.addClass("choice-" + strToClass(fields[i]));
				$("<td>").append($choices).appendTo($row);
			}
			$("<td>").text(name).appendTo($row);
			$row.addClass("kink-" + strToClass(name));
			return $row;
		},
		createColumns: function () {
			var colClasses = ["100", "50", "33", "25"];

			var numCols = Math.floor((document.body.scrollWidth - 20) / 400);
			if (!numCols) numCols = 1;
			if (numCols > 4) numCols = 4;
			var colClass = "col" + colClasses[numCols - 1];

			inputKinks.$columns = [];
			for (var i = 0; i < numCols; i++) {
				inputKinks.$columns.push(
					$("<div>")
					.addClass("col " + colClass)
					.appendTo($("#InputList"))
				);
			}
		},
		placeCategories: function ($categories) {
			var $body = $("body");
			var totalHeight = 0;
			for (var i = 0; i < $categories.length; i++) {
				var $clone = $categories[i].clone().appendTo($body);
				var height = $clone.height();
				totalHeight += height;
				$clone.remove();
			}

			var colHeight = totalHeight / inputKinks.$columns.length;
			var colIndex = 0;
			for (var i = 0; i < $categories.length; i++) {
				var curHeight = inputKinks.$columns[colIndex].height();
				var catHeight = $categories[i].height();
				if (curHeight + catHeight / 2 > colHeight) colIndex++;
				while (colIndex >= inputKinks.$columns.length) {
					colIndex--;
				}
				inputKinks.$columns[colIndex].append($categories[i]);
			}
		},fillInputList: function () {
			// Empty the input list container
			$("#InputList").empty();
			
			// Create the columns for input list
			inputKinks.createColumns();
		
			var $categories = [];
			var kinkCats = Object.keys(kinks);
		
			// Iterate over each category and generate the necessary elements
			kinkCats.forEach(catName => {
				var category = kinks[catName];
				var fields = category.fields;
				var kinkArr = category.kinks;
		
				var $category = inputKinks.createCategory(catName, fields);
				var $tbody = $category.find("tbody");
		
				// Append each kink to the category's table body
				kinkArr.forEach(kink => {
					$tbody.append(inputKinks.createKink(fields, kink));
				});
		
				$categories.push($category);
			});
		
			// Place the categories into the DOM
			inputKinks.placeCategories($categories);
		
			// Attach event listener for the choices buttons to update the hash without page refresh
			$("#InputList")
				.find("button.choice")
				.off("click") // Prevent duplicate event listeners
				.on("click", function () {
					var newHash = inputKinks.updateHash();
					if (newHash !== location.hash.substring(1)) {
						history.replaceState(null, null, "#" + newHash); // Update hash without page refresh
					}
				});
		},		
		init: function () {
			// Set up DOM
			inputKinks.fillInputList();
		
			// Read hash
			inputKinks.parseHash();
		
			// Setup event listeners
			this.setupEventListeners();
		
			// Handle window resize
			this.setupResizeHandler();
		},
		
		setupEventListeners: function () {
			// Make export button work
			$("#Export").on("click", inputKinks.export);
		
			// Select text on URL click
			$("#URL").on("click", function () {
				this.select();
			});
		},
		
		setupResizeHandler: function () {
			var lastResize = 0;
			$(window).on("resize", function () {
				var curTime = new Date().getTime();
				lastResize = curTime;
				setTimeout(function () {
					if (lastResize === curTime) {
						inputKinks.fillInputList();
						inputKinks.parseHash();
					}
				}, 500);
			});
		},
		
		hashChars: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.=+*^!@",
		
		maxPow: function (base, maxVal) {
			var maxPow = 1;
			for (var pow = 1; Math.pow(base, pow) <= maxVal; pow++) {
				maxPow = pow;
			}
			return maxPow;
		},
		
		prefix: function (input, len, char) {
			return input.padStart(len, char);
		},
		
		drawLegend: function (context) {
			context.font = "bold 13px Arial";
			context.fillStyle = "#000000";
		
			var levels = Object.keys(colors);
			var x = context.canvas.width - 15 - 120 * levels.length;
			
			levels.forEach((level, i) => {
				context.beginPath();
				context.arc(x + 120 * i, 17, 8, 0, 2 * Math.PI, false);
				context.fillStyle = colors[level];
				context.fill();
				context.strokeStyle = "rgba(0, 0, 0, 0.5)";
				context.lineWidth = 1;
				context.stroke();
		
				context.fillStyle = "#000000";
				context.fillText(level, x + 15 + i * 120, 22);
			});
		},
		
		setupCanvas: function (width, height, username) {
			$("canvas").remove();
			var canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
		
			var $canvas = $(canvas).css({ width: width, height: height });
			var context = canvas.getContext("2d");
			
			context.fillStyle = "#FFFFFF";
			context.fillRect(0, 0, canvas.width, canvas.height);
		
			context.font = "bold 24px Arial";
			context.fillStyle = "#000000";
			context.fillText("Kinklist " + username, 5, 25);
		
			inputKinks.drawLegend(context);
			
			return { context, canvas };
		},
		
		drawCallHandlers: {
			simpleTitle: function (context, drawCall) {
				context.fillStyle = "#000000";
				context.font = "bold 18px Arial";
				context.fillText(drawCall.data, drawCall.x, drawCall.y + 5);
			},
			titleSubtitle: function (context, drawCall) {
				context.fillStyle = "#000000";
				context.font = "bold 18px Arial";
				context.fillText(drawCall.data.category, drawCall.x, drawCall.y + 5);
		
				var fieldsStr = drawCall.data.fields.join(", ");
				context.font = "italic 12px Arial";
				context.fillText(fieldsStr, drawCall.x, drawCall.y + 20);
			},
			kinkRow: function (context, drawCall) {
				context.fillStyle = "#000000";
				context.font = "12px Arial";
		
				var x = drawCall.x + 5 + drawCall.data.choices.length * 20;
				var y = drawCall.y - 6;
				context.fillText(drawCall.data.text, x, y);
		
				// Circles for choices
				drawCall.data.choices.forEach((choice, i) => {
					var color = colors[choice];
					var x = 10 + drawCall.x + i * 20;
					var y = drawCall.y - 10;
		
					context.beginPath();
					context.arc(x, y, 8, 0, 2 * Math.PI, false);
					context.fillStyle = color;
					context.fill();
					context.strokeStyle = "rgba(0, 0, 0, 0.5)";
					context.lineWidth = 1;
					context.stroke();
				});
			},
		},
		
		export: function () {
			var username = prompt("Please enter your name");
			if (typeof username !== "string" || !username.length) return;
		
			username = `(${username})`;
		
			$("#Loading").fadeIn();
			$("#URL").fadeOut();
		
			// Constants
			const numCols = 6, columnWidth = 250, simpleTitleHeight = 35,
				  titleSubtitleHeight = 50, rowHeight = 25,
				  offsets = { left: 10, right: 10, top: 50, bottom: 10 };
		
			// Calculate number of categories and kinks
			var numCats = $(".kinkCategory").length;
			var dualCats = $(".kinkCategory th + th + th").length;
			var simpleCats = numCats - dualCats;
			var numKinks = $(".kinkRow").length;
		
			// Calculate total height required
			var totalHeight = numKinks * rowHeight + dualCats * titleSubtitleHeight + simpleCats * simpleTitleHeight;
		
			// Initialize columns and draw stacks
			var columns = Array.from({ length: numCols }, () => ({ height: 0, drawStack: [] }));
		
			// Create drawcalls and place them in the appropriate column
			var avgColHeight = totalHeight / numCols;
			var columnIndex = 0;
		
			$(".kinkCategory").each(function () {
				var $cat = $(this);
				var catName = $cat.data("category");
				var category = kinks[catName];
				var fields = category.fields;
				var catKinks = category.kinks;
		
				var catHeight = fields.length === 1 ? simpleTitleHeight : titleSubtitleHeight;
				catHeight += catKinks.length * rowHeight;
		
				// Determine column for this category
				if (columns[columnIndex].height + catHeight / 2 > avgColHeight) columnIndex++;
				while (columnIndex >= numCols) columnIndex--;
				var column = columns[columnIndex];
		
				// Create drawcall for category title
				var drawCall = { y: column.height };
				column.drawStack.push(drawCall);
		
				if (fields.length < 2) {
					column.height += simpleTitleHeight;
					drawCall.type = "simpleTitle";
					drawCall.data = catName;
				} else {
					column.height += titleSubtitleHeight;
					drawCall.type = "titleSubtitle";
					drawCall.data = { category: catName, fields };
				}
		
				// Create drawcalls for kinks
				$cat.find(".kinkRow").each(function () {
					var $kinkRow = $(this);
					var kinkText = $kinkRow.data("kink");
		
					var drawCall = {
						y: column.height,
						type: "kinkRow",
						data: { choices: [], text: kinkText },
					};
					column.drawStack.push(drawCall);
					column.height += rowHeight;
		
					$kinkRow.find(".choices").each(function () {
						var $selection = $(this).find(".choice.selected");
						var selection = $selection.length > 0 ? $selection.data("level") : Object.keys(level)[0];
						drawCall.data.choices.push(selection);
					});
				});
			});
		
			var tallestColumnHeight = Math.max(...columns.map(c => c.height));
			var canvasWidth = offsets.left + offsets.right + columnWidth * numCols;
			var canvasHeight = offsets.top + offsets.bottom + tallestColumnHeight;
			var setup = inputKinks.setupCanvas(canvasWidth, canvasHeight, username);
			var context = setup.context;
			var canvas = setup.canvas;
		
			// Draw everything
			columns.forEach((column, i) => {
				var drawX = offsets.left + columnWidth * i;
				column.drawStack.forEach((drawCall) => {
					drawCall.x = drawX;
					drawCall.y += offsets.top;
					inputKinks.drawCallHandlers[drawCall.type](context, drawCall);
				});
			});
		
			// Upload to imgur
			$.ajax({
				url: "https://api.imgur.com/3/image",
				type: "POST",
				headers: { Authorization: "Client-ID " + imgurClientId, Accept: "application/json" },
				data: { image: canvas.toDataURL().split(",")[1], type: "base64" },
				success: function (result) {
					$("#Loading").hide();
					var url = "https://i.imgur.com/" + result.data.id + ".png";
					$("#URL").val(url).fadeIn();
				},
				fail: function () {
					$("#Loading").hide();
					alert("Failed to upload to imgur, could not connect");
				},
			});
		},		
		encode: function (base, input) {
			// Check if input hasn't changed
			if (input === previousInput) {
				console.log('Skipping encoding: Input is the same');
				return; // Avoid running encoding if input hasn't changed
			}
			
			// Update previous input to the current one
			previousInput = input;
			console.log('Encoding input with base:', base, 'and input length:', input.length);
	
			const hashBase = inputKinks.hashChars.length;
			const outputPow = inputKinks.maxPow(hashBase, Number.MAX_SAFE_INTEGER);
			const inputPow = inputKinks.maxPow(base, Math.pow(hashBase, outputPow));
	
			let output = "";
			const numChunks = Math.ceil(input.length / inputPow);
			let inputIndex = 0;
	
			for (let chunkId = 0; chunkId < numChunks; chunkId++) {
				let inputIntValue = 0;
	
				// Process each chunk of input
				for (let pow = 0; pow < inputPow; pow++) {
					const inputVal = input[inputIndex++];
					if (typeof inputVal === "undefined") break;
					inputIntValue += inputVal * Math.pow(base, pow);
				}
	
				let outputCharValue = "";
				
				// Convert the chunk's integer value to a string
				while (inputIntValue > 0) {
					const maxPow = Math.floor(Math.log(inputIntValue) / Math.log(hashBase));
					const powVal = Math.pow(hashBase, maxPow);
					const charInt = Math.floor(inputIntValue / powVal);
					const char = inputKinks.hashChars[charInt];
					outputCharValue += char;
					inputIntValue -= charInt * powVal;
				}
	
				// Ensure output chunk has the correct length
				const chunk = inputKinks.prefix(outputCharValue, outputPow, inputKinks.hashChars[0]);
				output += chunk;
			}
	
			console.log('Encoding result:', output);
			return output;
		},
		
		decode: function (base, output) {
			// Check if output hasn't changed
			if (output === previousOutput) {
				console.log('Skipping decoding: Output is the same');
				return; // Avoid running decoding if output hasn't changed
			}
	
			// Update previous output to the current one
			previousOutput = output;
			console.log('Decoding output with base:', base, 'and output length:', output.length);
	
			const hashBase = inputKinks.hashChars.length;
			const outputPow = inputKinks.maxPow(hashBase, Number.MAX_SAFE_INTEGER);
	
			let values = [];
			const numChunks = Math.ceil(output.length / outputPow);
	
			// Process each chunk in the output
			for (let i = 0; i < numChunks; i++) {
				const chunk = output.substring(i * outputPow, (i + 1) * outputPow);
				const chunkValues = inputKinks.decodeChunk(base, chunk);
				values = values.concat(chunkValues);
			}
	
			console.log('Decoded values:', values);
			return values;
		},
		
		decodeChunk: function (base, chunk) {
			const hashBase = inputKinks.hashChars.length;
			const outputPow = inputKinks.maxPow(hashBase, Number.MAX_SAFE_INTEGER);
			const inputPow = inputKinks.maxPow(base, Math.pow(hashBase, outputPow));
	
			let chunkInt = 0;
	
			// Convert the chunk's string value to an integer
			for (let i = 0; i < chunk.length; i++) {
				const char = chunk[i];
				const charInt = inputKinks.hashChars.indexOf(char);
				const pow = chunk.length - 1 - i;
				chunkInt += charInt * Math.pow(hashBase, pow);
			}
	
			const output = [];
	
			// Convert the integer back into an array of base values
			for (let pow = inputPow - 1; pow >= 0; pow--) {
				const posBase = Math.floor(Math.pow(base, pow));
				const posVal = Math.floor(chunkInt / posBase);
				output.push(posVal);
				chunkInt -= posVal * posBase;
			}
	
			console.log('Decoded chunk to values:', output.reverse());
			return output.reverse();
		},
		
		updateHash: function () {
			let hashValues = [];
			$("#InputList .choices").each(function () {
				const $this = $(this);
				let lvlInt = $this.find(".selected").data("levelInt");
				if (!lvlInt) lvlInt = 0;
				hashValues.push(lvlInt);
			});
	
			// Generate the hash
			const newHash = inputKinks.encode(Object.keys(colors).length, hashValues);
	
			// Only update the hash if it's different
			if (newHash !== location.hash.substring(1)) {
				console.log('Updating hash:', newHash);
				history.replaceState(null, null, "#" + newHash); // Update hash without reload
			} else {
				console.log('Hash is unchanged, skipping update');
			}
	
			return newHash;
		},
		
		parseHash: function () {
			const hash = location.hash.substring(1);
			if (hash.length < 10) return;
			
			console.log('Parsing hash:', hash);
			const values = inputKinks.decode(Object.keys(colors).length, hash);
			let valueIndex = 0;
	
			$("#InputList .choices").each(function () {
				const $this = $(this);
				const value = values[valueIndex++];
				$this.children().eq(value).addClass("selected");
			});
		},
		
		saveSelection: function () {
			var selection = [];
			$(".choice.selected").each(function () {
				// .choice selector
				var selector = "." + this.className.replace(/ /g, ".");
				
				// .choices selector
				selector = "." + $(this).closest(".choices")[0].className.replace(/ /g, ".") + " " + selector;
				
				// .kinkRow selector
				selector = "." + $(this).closest("tr.kinkRow")[0].className.replace(/ /g, ".") + " " + selector;
				
				// .kinkCategory selector
				selector = "." + $(this).closest(".kinkCategory")[0].className.replace(/ /g, ".") + " " + selector;
				
				// Remove the '.selected' part
				selector = selector.replace(".selected", "");
				
				selection.push(selector);
			});
		
			// Use requestAnimationFrame for smoother DOM manipulation
			requestAnimationFrame(() => {
				return selection;
			});
		},
		
		inputListToText: function () {
			var KinksText = "";
			var kinkCats = Object.keys(kinks);
			
			kinkCats.forEach((catName) => {
				var catFields = kinks[catName].fields;
				var catKinks = kinks[catName].kinks;
				KinksText += "#" + catName + "\r\n";
				KinksText += "(" + catFields.join(", ") + ")\r\n";
				catKinks.forEach((kink) => {
					KinksText += "* " + kink + "\r\n";
				});
				KinksText += "\r\n";
			});
		
			return KinksText;
		},
		
		restoreSavedSelection: function (selection) {
			// Temporarily disable hash change to prevent unwanted scrolling/reloading behavior
			const currentHash = location.hash;
			
			// Use requestAnimationFrame for smoother updates
			requestAnimationFrame(() => {
				selection.forEach((selector) => {
					$(selector).addClass("selected");
				});
		
				// Only update the hash if it's different from the current one
				const newHash = inputKinks.updateHash();
				if (newHash !== currentHash) {
					history.replaceState(null, null, newHash); // Updates the hash without causing a page reload
				}
			});
		},
		
		parseKinksText: function (kinksText) {
			var newKinks = {};
			var lines = kinksText.replace(/\r/g, "").split("\n");
		
			var cat = null;
			var catName = null;
			
			// Using requestAnimationFrame for smoother DOM manipulation
			requestAnimationFrame(() => {
				for (var i = 0; i < lines.length; i++) {
					var line = lines[i];
					if (!line.length) continue;
		
					if (line[0] === "#") {
						if (catName) {
							if (!(cat.fields instanceof Array) || cat.fields.length < 1) {
								alert(catName + " does not have any fields defined!");
								return;
							}
							if (!(cat.kinks instanceof Array) || cat.kinks.length < 1) {
								alert(catName + " does not have any kinks listed!");
								return;
							}
							newKinks[catName] = cat;
						}
						catName = line.substring(1).trim();
						cat = {
							kinks: []
						};
					}
		
					if (!catName) continue;
					if (line[0] === "(") {
						cat.fields = line
							.substring(1, line.length - 1)
							.trim()
							.split(",");
						for (var j = 0; j < cat.fields.length; j++) {
							cat.fields[j] = cat.fields[j].trim();
						}
					}
					if (line[0] === "*") {
						var kink = line.substring(1).trim();
						cat.kinks.push(kink);
					}
				}
		
				// Final check after parsing
				if (catName && !newKinks[catName]) {
					if (!(cat.fields instanceof Array) || cat.fields.length < 1) {
						alert(catName + " does not have any fields defined!");
						return;
					}
					if (!(cat.kinks instanceof Array) || cat.kinks.length < 1) {
						alert(catName + " does not have any kinks listed!");
						return;
					}
					newKinks[catName] = cat;
				}
		
				// Updating the hash in the URL (with no page refresh)
				var hashValues = [];
				for (var cat in newKinks) {
					hashValues.push(newKinks[cat].kinks.length); // Assuming we are encoding the number of kinks
				}
				var newHash = inputKinks.encode(Object.keys(colors).length, hashValues);
				if (newHash !== location.hash.substring(1)) {
					history.replaceState(null, null, "#" + newHash); // Update hash without page refresh
				}
			});
		
			return newKinks;
		}},		

	$("#Edit").on("click", function () {
		var KinksText = inputKinks.inputListToText();
		$("#Kinks").val(KinksText.trim());
		$("#EditOverlay").fadeIn();
	});
	$("#EditOverlay").on("click", function () {
		$(this).fadeOut();
	});
	$("#KinksOK").on("click", function () {
		var selection = inputKinks.saveSelection();
		try {
			var kinksText = $("#Kinks").val();
			kinks = inputKinks.parseKinksText(kinksText);
			inputKinks.fillInputList();
		} catch (e) {
			alert(
				"An error occured trying to parse the text entered, please correct it and try again"
			);
			return;
		}
		inputKinks.restoreSavedSelection(selection);
		$("#EditOverlay").fadeOut();
	});
	$(".overlay > *").on("click", function (e) {
		e.stopPropagation();
	});

	var stylesheet = document.styleSheets[0];
	$(".legend .choice").each(function () {
		var $choice = $(this);
		var $parent = $choice.parent();
		var text = $parent.text().trim();
		var color = $choice.data("color");
		var cssClass = this.className.replace("choice ", "").trim();

		addCssRule(".choice." + cssClass, "background-color: " + color + ";");
		colors[text] = color;
		level[text] = cssClass;
	});

	kinks = inputKinks.parseKinksText($("#Kinks").text().trim());
	inputKinks.init();

	(function () {
		var $popup = $("#InputOverlay");
		var $previous = $("#InputPrevious");
		var $next = $("#InputNext");

		// current
		var $category = $("#InputCategory");
		var $field = $("#InputField");
		var $options = $("#InputValues");

		function getChoiceValue($choices) {
			var $selected = $choices.find(".choice.selected");
			return $selected.data("level");
		}

		function getChoicesElement(category, kink, field) {
			var selector = ".cat-" + strToClass(category);
			selector += " .kink-" + strToClass(kink);
			selector += " .choice-" + strToClass(field);

			var $choices = $(selector);
			return $choices;
		}

		inputKinks.getAllKinks = function () {
			var list = [];

			var categories = Object.keys(kinks);
			for (var i = 0; i < categories.length; i++) {
				var category = categories[i];
				var fields = kinks[category].fields;
				var kinkArr = kinks[category].kinks;

				for (var j = 0; j < fields.length; j++) {
					var field = fields[j];
					for (var k = 0; k < kinkArr.length; k++) {
						var kink = kinkArr[k];
						var $choices = getChoicesElement(category, kink, field);
						var value = getChoiceValue($choices);
						var obj = {
							category: category,
							kink: kink,
							field: field,
							value: value,
							$choices: $choices,
							showField: fields.length >= 2,
						};
						list.push(obj);
					}
				}
			}
			return list;
		};

		inputKinks.inputPopup = {
			numPrev: 3,
			numNext: 3,
			allKinks: [],
			kinkByIndex: function (i) {
				var numKinks = inputKinks.inputPopup.allKinks.length;
				i = (numKinks + i) % numKinks;
				return inputKinks.inputPopup.allKinks[i];
			},
			generatePrimary: function (kink) {
				var $container = $("<div>");
				var btnIndex = 0;
				$(".legend > div").each(function () {
					var $btn = $(this).clone();
					$btn.addClass("big-choice");
					$btn.appendTo($container);

					$("<span>")
						.addClass("btn-num-text")
						.text(btnIndex++)
						.appendTo($btn);

					var text = $btn.text().trim().replace(/[0-9]/g, "");
					if (kink.value === text) {
						$btn.addClass("selected");
					}

					$btn.on("click", function () {
						$container.find(".big-choice").removeClass("selected");
						$btn.addClass("selected");
						kink.value = text;
						$options.fadeOut(200, function () {
							$options.show();
							inputKinks.inputPopup.showNext();
						});
						var choiceClass = strToClass(text);
						kink.$choices.find("." + choiceClass).click();
					});
				});
				return $container;
			},
			generateSecondary: function (kink) {
				var $container = $('<div class="kink-simple">');
				$('<span class="choice">')
					.addClass(level[kink.value])
					.appendTo($container);
				$('<span class="txt-category">')
					.text(kink.category)
					.appendTo($container);
				if (kink.showField) {
					$('<span class="txt-field">').text(kink.field).appendTo($container);
				}
				$('<span class="txt-kink">').text(kink.kink).appendTo($container);
				return $container;
			},
			showIndex: function (index) {
				$previous.html("");
				$next.html("");
				$options.html("");
				$popup.data("index", index);

				// Current
				var currentKink = inputKinks.inputPopup.kinkByIndex(index);
				var $currentKink = inputKinks.inputPopup.generatePrimary(currentKink);
				$options.append($currentKink);
				$category.text(currentKink.category);
				$field.text(
					(currentKink.showField ? "(" + currentKink.field + ") " : "") +
					currentKink.kink
				);
				$options.append($currentKink);

				// Prev
				for (var i = inputKinks.inputPopup.numPrev; i > 0; i--) {
					var prevKink = inputKinks.inputPopup.kinkByIndex(index - i);
					var $prevKink = inputKinks.inputPopup.generateSecondary(prevKink);
					$previous.append($prevKink);
					(function (skip) {
						$prevKink.on("click", function () {
							inputKinks.inputPopup.showPrev(skip);
						});
					})(i);
				}
				// Next
				for (var i = 1; i <= inputKinks.inputPopup.numNext; i++) {
					var nextKink = inputKinks.inputPopup.kinkByIndex(index + i);
					var $nextKink = inputKinks.inputPopup.generateSecondary(nextKink);
					$next.append($nextKink);
					(function (skip) {
						$nextKink.on("click", function () {
							inputKinks.inputPopup.showNext(skip);
						});
					})(i);
				}
			},
			showPrev: function (skip) {
				if (typeof skip !== "number") skip = 1;
				var index = $popup.data("index") - skip;
				var numKinks = inputKinks.inputPopup.allKinks.length;
				index = (numKinks + index) % numKinks;
				inputKinks.inputPopup.showIndex(index);
			},
			showNext: function (skip) {
				if (typeof skip !== "number") skip = 1;
				var index = $popup.data("index") + skip;
				var numKinks = inputKinks.inputPopup.allKinks.length;
				index = (numKinks + index) % numKinks;
				inputKinks.inputPopup.showIndex(index);
			},
			show: function () {
				inputKinks.inputPopup.allKinks = inputKinks.getAllKinks();
				inputKinks.inputPopup.showIndex(0);
				$popup.fadeIn();
			},
		};

		$(window).on("keydown", function (e) {
			if (e.altKey || e.shiftKey || e.ctrlKey) return;
			if (!$popup.is(":visible")) return;

			if (e.keyCode === 38) {
				inputKinks.inputPopup.showPrev();
				e.preventDefault();
				e.stopPropagation();
			}
			if (e.keyCode === 40) {
				inputKinks.inputPopup.showNext();
				e.preventDefault();
				e.stopPropagation();
			}

			var btn = -1;
			if (e.keyCode >= 96 && e.keyCode <= 101) {
				btn = e.keyCode - 96;
			} else if (e.keyCode >= 48 && e.keyCode <= 53) {
				btn = e.keyCode - 48;
			} else {
				return;
			}

			var $btn = $options.find(".big-choice").eq(btn);
			$btn.click();
		});
		$("#StartBtn").on("click", inputKinks.inputPopup.show);
		$("#InputCurrent .closePopup, #InputOverlay").on("click", function () {
			$popup.fadeOut();
		});
	})();
});
