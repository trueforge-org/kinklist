// Logarithm function to calculate log with any base
let log = (val, base) => Math.log(val) / Math.log(base);

// Converts a string to a valid class name with proper capitalization
let strToClass = (str) => {
  const validChars = "abcdefghijklmnopqrstuvwxyz";
  let className = "";
  let newWord = false;

  for (const char of str.toLowerCase()) {
    if (validChars.includes(char)) {
      className += newWord ? char.toUpperCase() : char;
      newWord = false;
    } else {
      newWord = true;
    }
  }
  return className;
};

// Adds a new CSS rule to the first stylesheet in the document
const addCssRule = (selector, rules) => {
  const sheet = document.styleSheets[0];
  const ruleString = `${selector} { ${rules} }`;

  if ("insertRule" in sheet) {
    sheet.insertRule(ruleString, 0);
  } else if ("addRule" in sheet) {
    sheet.addRule(selector, rules, 0);
  }
};

// Example of variable initialization, can be modified or populated later
let kinks = {};
let inputKinks = {};
let colors = {};
let level = {};

// Tracking state to prevent unnecessary reloads
let previousState = {
  kinks: null,
  inputKinks: null,
  colors: null,
  level: null
};

// Check if state has changed to avoid redundant actions
let hasStateChanged = () => {
  return JSON.stringify(kinks) !== JSON.stringify(previousState.kinks) ||
         JSON.stringify(inputKinks) !== JSON.stringify(previousState.inputKinks) ||
         JSON.stringify(colors) !== JSON.stringify(previousState.colors) ||
         JSON.stringify(level) !== JSON.stringify(previousState.level);
};

// Updates state and prevents unnecessary reloads
let updateState = () => {
  if (hasStateChanged()) {
    previousState = { kinks, inputKinks, colors, level };
    console.log('State has changed, performing action...');
    // Add your action here, like reloading or updating DOM
  } else {
    console.log('No change in state, skipping action.');
  }
};

// Call this function whenever you need to check and update the state
let checkAndUpdate = () => {
  updateState();
};

// Example function call to check state
checkAndUpdate();
$(function () {
    var imgurClientId = "9db53e5936cd02f";
    let previousInput = null;
    let previousOutput = null;
    let debounceTimeout;

    // Debounce function to limit the rate of function execution
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
            fields.forEach(field => {
                $("<th>").addClass("choicesCol").text(field).appendTo($thead);
            });
            $("<th>").appendTo($thead);  // Additional column for layout
            $("<tbody>").appendTo($table);
            $category.append($table);

            return $category;
        },

        createChoice: function () {
            var $container = $("<div>").addClass("choices");
            Object.keys(level).forEach((levelKey, i) => {
                $("<button>")
                    .addClass("choice")
                    .addClass(level[levelKey])
                    .data("level", levelKey)
                    .data("levelInt", i)
                    .attr("title", levelKey)
                    .appendTo($container)
                    .on("click", function () {
                        $container.find("button").removeClass("selected");
                        $(this).addClass("selected");
                    });
            });
            return $container;
        },

        createKink: function (fields, name) {
            var $row = $("<tr>").data("kink", name).addClass("kinkRow");
            fields.forEach(field => {
                var $choices = inputKinks.createChoice();
                $choices.data("field", field);
                $choices.addClass("choice-" + strToClass(field));
                $("<td>").append($choices).appendTo($row);
            });
            $("<td>").text(name).appendTo($row);
            $row.addClass("kink-" + strToClass(name));
            return $row;
        },

        createColumns: function () {
            const colClasses = ["100", "50", "33", "25"];
            let numCols = Math.floor((document.body.scrollWidth - 20) / 400);
            numCols = Math.max(1, Math.min(numCols, 4));  // Ensure it's between 1 and 4 columns
            const colClass = "col" + colClasses[numCols - 1];

            inputKinks.$columns = [];
            for (let i = 0; i < numCols; i++) {
                inputKinks.$columns.push($("<div>").addClass("col " + colClass).appendTo($("#InputList")));
            }
        },

        placeCategories: function ($categories) {
            let $body = $("body");
            let totalHeight = $categories.reduce((total, cat) => total + cat.height(), 0);
            let colHeight = totalHeight / inputKinks.$columns.length;
            let colIndex = 0;

            $categories.forEach($category => {
                let curHeight = inputKinks.$columns[colIndex].height();
                let catHeight = $category.height();
                if (curHeight + catHeight / 2 > colHeight) colIndex++;
                colIndex = Math.min(colIndex, inputKinks.$columns.length - 1);  // Prevent overflow

                inputKinks.$columns[colIndex].append($category);
            });
        },

        fillInputList: function () {
            $("#InputList").empty();
            inputKinks.createColumns();

            var $categories = [];
            Object.keys(kinks).forEach(catName => {
                var category = kinks[catName];
                var $category = inputKinks.createCategory(catName, category.fields);
                var $tbody = $category.find("tbody");

                category.kinks.forEach(kink => {
                    $tbody.append(inputKinks.createKink(category.fields, kink));
                });

                $categories.push($category);
            });

            inputKinks.placeCategories($categories);

            // Attach event listener for the choices buttons to update the hash without page refresh
            $("#InputList").find("button.choice")
                .off("click")
                .on("click", function () {
                    const newHash = inputKinks.updateHash();
                    if (newHash !== location.hash.substring(1)) {
                        history.replaceState(null, null, "#" + newHash);
                    }
                });
        },

        init: function () {
            inputKinks.fillInputList();
            inputKinks.parseHash();
            this.setupEventListeners();
            this.setupResizeHandler();
        },

        setupEventListeners: function () {
            $("#Export").on("click", inputKinks.export);

            $("#URL").on("click", function () {
                this.select();
            });
        },

        setupResizeHandler: function () {
            let lastResize = 0;
            $(window).on("resize", function () {
                let curTime = new Date().getTime();
                lastResize = curTime;
                setTimeout(() => {
                    if (lastResize === curTime) {
                        inputKinks.fillInputList();
                        inputKinks.parseHash();
                    }
                }, 500);
            });
        },

        hashChars: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.=+*^!@",

        maxPow: function (base, maxVal) {
            let maxPow = 1;
            for (let pow = 1; Math.pow(base, pow) <= maxVal; pow++) {
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

            const levels = Object.keys(colors);
            let x = context.canvas.width - 15 - 120 * levels.length;
            
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
		updateHash: function () {
			return $("#InputList")
				.find("button.selected")
				.map((_, button) => $(button).data("level"))
				.toArray()
				.join("");
		},
	
		saveSelection: function () {
			var selection = [];
			$(".choice.selected").each(function () {
				var selector = "." + this.className.replace(/ /g, ".");
				selector = "." + $(this).closest(".choices")[0].className.replace(/ /g, ".") + " " + selector;
				selector = "." + $(this).closest("tr.kinkRow")[0].className.replace(/ /g, ".") + " " + selector;
				selector = "." + $(this).closest(".kinkCategory")[0].className.replace(/ /g, ".") + " " + selector;
				selector = selector.replace(".selected", "");
				selection.push(selector);
			});
	
			// Use requestAnimationFrame for smoother DOM manipulation
			requestAnimationFrame(() => selection);
		},
	
		inputListToText: function () {
			var KinksText = "";
			Object.keys(kinks).forEach((catName) => {
				var { fields, kinks: catKinks } = kinks[catName];
				KinksText += `#${catName}\r\n(${fields.join(", ")})\r\n`;
				catKinks.forEach((kink) => {
					KinksText += `* ${kink}\r\n`;
				});
				KinksText += "\r\n";
			});
	
			return KinksText;
		},
	
		restoreSavedSelection: function (selection) {
			const currentHash = location.hash;
	
			requestAnimationFrame(() => {
				selection.forEach((selector) => {
					$(selector).addClass("selected");
				});
	
				const newHash = inputKinks.updateHash();
				if (newHash !== currentHash) {
					history.replaceState(null, null, newHash);
				}
			});
		},
	
		parseKinksText: function (kinksText) {
			const newKinks = {};
			const lines = kinksText.replace(/\r/g, "").split("\n");
	
			let cat = null, catName = null;
			requestAnimationFrame(() => {
				lines.forEach((line) => {
					if (!line.length) return;
	
					if (line[0] === "#") {
						if (catName) {
							if (!(cat.fields instanceof Array) || cat.fields.length < 1) {
								alert(`${catName} does not have any fields defined!`);
								return;
							}
							if (!(cat.kinks instanceof Array) || cat.kinks.length < 1) {
								alert(`${catName} does not have any kinks listed!`);
								return;
							}
							newKinks[catName] = cat;
						}
						catName = line.substring(1).trim();
						cat = { kinks: [] };
					}
	
					if (!catName) return;
	
					if (line[0] === "(") {
						cat.fields = line.substring(1, line.length - 1).trim().split(",");
						cat.fields = cat.fields.map((field) => field.trim());
					}
	
					if (line[0] === "*") {
						const kink = line.substring(1).trim();
						cat.kinks.push(kink);
					}
				});
	
				if (catName && !newKinks[catName]) {
					if (!(cat.fields instanceof Array) || cat.fields.length < 1) {
						alert(`${catName} does not have any fields defined!`);
						return;
					}
					if (!(cat.kinks instanceof Array) || cat.kinks.length < 1) {
						alert(`${catName} does not have any kinks listed!`);
						return;
					}
					newKinks[catName] = cat;
				}
	
				var hashValues = Object.keys(newKinks).map((cat) => newKinks[cat].kinks.length);
				const newHash = inputKinks.encode(Object.keys(colors).length, hashValues);
				if (newHash !== location.hash.substring(1)) {
					history.replaceState(null, null, "#" + newHash);
				}
			});
	
			return newKinks;
		}
	};
	
	$("#Edit").on("click", function () {
		const KinksText = inputKinks.inputListToText();
		$("#Kinks").val(KinksText.trim());
		$("#EditOverlay").fadeIn();
	});
	
	$("#EditOverlay").on("click", function () {
		$(this).fadeOut();
	});
	
	$("#KinksOK").on("click", function () {
		const selection = inputKinks.saveSelection();
		try {
			const kinksText = $("#Kinks").val();
			kinks = inputKinks.parseKinksText(kinksText);
			inputKinks.fillInputList();
		} catch (e) {
			alert("An error occurred while parsing the text entered. Please correct it and try again.");
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
	
		addCssRule(`.choice.${cssClass}`, `background-color: ${color};`);
		colors[text] = color;
		level[text] = cssClass;
	});
	
	kinks = inputKinks.parseKinksText($("#Kinks").text().trim());
	inputKinks.init();
	
	(function () {
		const $popup = $("#InputOverlay");
		const $previous = $("#InputPrevious");
		const $next = $("#InputNext");
	
		const $category = $("#InputCategory");
		const $field = $("#InputField");
		const $options = $("#InputValues");
	
		function getChoiceValue($choices) {
			return $choices.find(".choice.selected").data("level");
		}
	
		function getChoicesElement(category, kink, field) {
			const selector = `.cat-${strToClass(category)} .kink-${strToClass(kink)} .choice-${strToClass(field)}`;
			return $(selector);
		}
	
		inputKinks.getAllKinks = function () {
			const list = [];
			Object.keys(kinks).forEach((category) => {
				const { fields, kinks: kinkArr } = kinks[category];
				fields.forEach((field) => {
					kinkArr.forEach((kink) => {
						const $choices = getChoicesElement(category, kink, field);
						const value = getChoiceValue($choices);
						list.push({
							category, kink, field, value, $choices,
							showField: fields.length >= 2
						});
					});
				});
			});
			return list;
		};
	
		inputKinks.inputPopup = {
			numPrev: 3,
			numNext: 3,
			allKinks: [],
			kinkByIndex(i) {
				const numKinks = inputKinks.inputPopup.allKinks.length;
				i = (numKinks + i) % numKinks;
				return inputKinks.inputPopup.allKinks[i];
			},
			generatePrimary(kink) {
				const $container = $("<div>");
				let btnIndex = 0;
	
				$(".legend > div").each(function () {
					const $btn = $(this).clone();
					$btn.addClass("big-choice");
					$btn.appendTo($container);
	
					$("<span>").addClass("btn-num-text").text(btnIndex++).appendTo($btn);
	
					const text = $btn.text().trim().replace(/[0-9]/g, "");
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
						const choiceClass = strToClass(text);
						kink.$choices.find(`.${choiceClass}`).click();
					});
				});
	
				return $container;
			},
			generateSecondary(kink) {
				const $container = $('<div class="kink-simple">');
				$('<span class="choice">').addClass(level[kink.value]).appendTo($container);
				$('<span class="txt-category">').text(kink.category).appendTo($container);
				if (kink.showField) {
					$('<span class="txt-field">').text(kink.field).appendTo($container);
				}
				$('<span class="txt-kink">').text(kink.kink).appendTo($container);
				return $container;
			},
			showIndex(index) {
				$previous.html("");
				$next.html("");
				$options.html("");
				$popup.data("index", index);
	
				const currentKink = inputKinks.inputPopup.kinkByIndex(index);
				const $currentKink = inputKinks.inputPopup.generatePrimary(currentKink);
				$options.append($currentKink);
				$category.text(currentKink.category);
				$field.text((currentKink.showField ? `(${currentKink.field}) ` : "") + currentKink.kink);
				$options.append($currentKink);
	
				for (let i = inputKinks.inputPopup.numPrev; i > 0; i--) {
					const prevKink = inputKinks.inputPopup.kinkByIndex(index - i);
					$previous.append(inputKinks.inputPopup.generateSecondary(prevKink));
				}
	
				for (let i = 1; i <= inputKinks.inputPopup.numNext; i++) {
					const nextKink = inputKinks.inputPopup.kinkByIndex(index + i);
					$next.append(inputKinks.inputPopup.generateSecondary(nextKink));
				}
	
				$popup.fadeIn();
			},
			showNext() {
				const index = $popup.data("index");
				const currentKink = inputKinks.inputPopup.kinkByIndex(index + 1);
				inputKinks.inputPopup.showIndex(currentKink);
			},
			showPrev() {
				const index = $popup.data("index");
				const currentKink = inputKinks.inputPopup.kinkByIndex(index - 1);
				inputKinks.inputPopup.showIndex(currentKink);
			}
		};
	})();
});

