document.addEventListener("DOMContentLoaded", () => {
	// Collapsible menu logic
	const collapsibles = document.querySelectorAll(".collapsible");
	collapsibles.forEach((btn) => {
		btn.addEventListener("click", () => {
			const content = btn.nextElementSibling;
			content.style.display =
				content.style.display === "block" ? "none" : "block";
		});
	});

	const viewer = OpenSeadragon({
		id: "openseadragon",
		prefixUrl:
			"https://cdnjs.cloudflare.com/ajax/libs/openseadragon/3.1.0/images/",
		tileSources: "assets/output_map.dzi",
		gestureSettingsMouse: {
			clickToZoom: false,
			dblClickToZoom: true,
			dragToPan: true,
			pinchToZoom: true,
			scrollToZoom: true,
		},
		constrainDuringPan: true,
		showNavigator: false,
		blendTime: 0.1,
		maxZoomPixelRatio: 2,
	});

	const zoomDisplay = document.getElementById("zoom-level");
	const loadingIndicator = document.getElementById("loading-indicator");
	const resetZoomBtn = document.getElementById("resetZoomBtn");
	const centerMapBtn = document.getElementById("centerMapBtn");

	// Show loading on start
	loadingIndicator.style.display = "flex";

	viewer.addHandler("open", function () {
		const center = viewer.viewport.getCenter();
		viewer.viewport.zoomTo(8);
		viewer.viewport.panTo(center);
		viewer.viewport.applyConstraints();

		// Hide loading indicator when image fully loaded
		loadingIndicator.style.display = "none";

		updateZoomDisplay();
	});

	viewer.addHandler("zoom", updateZoomDisplay);
	viewer.addHandler("animation", updateZoomDisplay);
	viewer.addHandler("resize", updateZoomDisplay);

	// Reset Zoom button functionality
	resetZoomBtn.addEventListener("click", () => {
		// Center and zoom to 8x
		const center = viewer.viewport.getCenter(); // Default center (0.5,0.5) is center of viewport coords
		viewer.viewport.zoomTo(8);
		viewer.viewport.panTo(center);
	});

	// Reset Zoom button functionality
	centerMapBtn.addEventListener("click", () => {
		const zoomLevel = 8;
		const centerPoint = new OpenSeadragon.Point(
			0.4913494847923874,
			0.020354443476950024
		);

		viewer.viewport.zoomTo(zoomLevel, centerPoint); // true for smooth animation
		viewer.viewport.panTo(centerPoint, true); // pan to same point
	});

	function updateZoomDisplay() {
		const zoom = viewer.viewport.getZoom();
		zoomDisplay.textContent = `Zoom: ${zoom.toFixed(2)}x`;
	}

	// Get Cords
	viewer.addHandler("canvas-click", function (event) {
		const originalEvent = event.originalEvent;

		// Check for Alt + Left Click
		if (originalEvent.altKey && originalEvent.button === 0) {
			const webPoint = event.position;
			const viewportPoint = viewer.viewport.pointFromPixel(webPoint);
			const imagePoint =
				viewer.viewport.viewportToImageCoordinates(viewportPoint);

			console.log("Viewport coords:", viewportPoint);
			console.log("Image coords:", imagePoint);

			// Format the viewport coordinates
			const viewportData = `{x: ${viewportPoint.x}, y: ${viewportPoint.y}}`;

			// Copy to clipboard
			navigator.clipboard
				.writeText(viewportData)
				.then(() => {
					console.log("Copied to clipboard:", viewportData);
				})
				.catch((err) => {
					console.error("Clipboard copy failed:", err);
				});

			// alert(
			// 	`Viewport: x=${viewportPoint.x.toFixed(
			// 		4
			// 	)}, y=${viewportPoint.y.toFixed(4)}\n` +
			// 		`Image: x=${imagePoint.x.toFixed(0)}, y=${imagePoint.y.toFixed(
			// 			0
			// 		)}\n` +
			// 		`Copied: ${viewportData}`
			// );
		}
	});

	fetch("assets/markers.json")
		.then((response) => {
			if (!response.ok) throw new Error("Network response was not ok");
			return response.json();
		})
		.then((locations) => {
			console.log("Loaded locations:", locations);

			// Create marker container
			const markersContainer = document.createElement("div");
			markersContainer.style.position = "absolute";
			markersContainer.style.top = "0";
			markersContainer.style.left = "0";
			markersContainer.style.width = "100%";
			markersContainer.style.height = "100%";
			markersContainer.style.pointerEvents = "none";
			document.getElementById("openseadragon").appendChild(markersContainer);

			// Tooltip
			const tooltip = document.createElement("div");
			tooltip.style.position = "absolute";
			tooltip.style.padding = "8px 12px";
			tooltip.style.background = "rgba(0,0,0,0.8)";
			tooltip.style.color = "white";
			tooltip.style.borderRadius = "6px";
			tooltip.style.fontSize = "13px";
			tooltip.style.pointerEvents = "none";
			tooltip.style.visibility = "hidden";
			tooltip.style.whiteSpace = "normal";
			tooltip.style.maxWidth = "250px";
			tooltip.style.zIndex = "1001";
			document.getElementById("openseadragon").appendChild(tooltip);

			// Loop over locations and create markers
			locations.forEach((loc) => {
				const marker = document.createElement("div");
				marker.className = "map-marker";
				marker.style.position = "absolute";
				marker.style.width = "16px";
				marker.style.height = "16px";
				marker.style.backgroundColor = "#0af";
				marker.style.border = "2px solid white";
				marker.style.borderRadius = "50%";
				marker.style.cursor = "pointer";
				marker.style.pointerEvents = "auto";

				function updateMarkerPosition() {
					const point = viewer.viewport.pixelFromPoint(
						new OpenSeadragon.Point(loc.viewport.x, loc.viewport.y),
						true
					);
					marker.style.left = `${point.x - 8}px`;
					marker.style.top = `${point.y - 8}px`;
				}
				updateMarkerPosition();

				// Tooltip on hover
				marker.addEventListener("mouseenter", () => {
					tooltip.innerHTML = `<strong>${loc.name}</strong><br>${loc.description}`;
					tooltip.style.visibility = "visible";
				});
				marker.addEventListener("mouseleave", () => {
					tooltip.style.visibility = "hidden";
				});
				marker.addEventListener("mousemove", (evt) => {
					const rect = document
						.getElementById("openseadragon")
						.getBoundingClientRect();
					const x = evt.clientX - rect.left + 12;
					const y = evt.clientY - rect.top + 12;
					tooltip.style.left = `${x}px`;
					tooltip.style.top = `${y}px`;
				});
				marker.addEventListener("click", () => {
					const viewportPoint = new OpenSeadragon.Point(
						loc.viewport.x,
						loc.viewport.y
					);
					const zoomLevel = 10;

					// Smooth pan first
					viewer.viewport.panTo(viewportPoint);

					// Then zoom after a short delay (ensures pan completes)
					setTimeout(() => {
						viewer.viewport.zoomTo(zoomLevel, viewportPoint);
					}, 350); // adjust delay as needed
				});

				markersContainer.appendChild(marker);
				viewer.addHandler("viewport-change", updateMarkerPosition);
			});
		})
		.catch((error) => {
			console.error("Failed to load locations:", error);
		});

	let flatLocations = [];

	function extractLocations(obj, path = []) {
		for (const key in obj) {
			if (key === "_coords" || typeof obj[key] !== "object") continue;
			if (obj[key]._coords) {
				flatLocations.push({
					name: [...path, key].join(" > "),
					coords: obj[key]._coords,
				});
			}
			extractLocations(obj[key], [...path, key]);
		}
	}

	fetch("assets/RailRoader.json")
		.then((res) => res.json())
		.then((data) => {
			extractLocations(data);
			console.log("Loaded locations:", flatLocations); // Debug
		});

	const input = document.getElementById("locationSearch");
	const suggestionsBox = document.getElementById("suggestions");

	function jumpToLocation(coords, zoomLevel = 10) {
		if (
			!coords ||
			typeof coords.x !== "number" ||
			typeof coords.y !== "number"
		) {
			console.error("Invalid coordinates:", coords);
			return;
		}
		const target = new OpenSeadragon.Point(coords.x, coords.y);
		viewer.viewport.panTo(target);
		setTimeout(() => {
			viewer.viewport.zoomTo(zoomLevel, target);
		}, 300);
		setTimeout(() => {
			highlightPoint(target);
		}, 1000);
	}

	function highlightPoint(viewportCoords) {
		const highlight = document.createElement("div");
		highlight.className = "map-highlight";

		viewer.addOverlay({
			element: highlight,
			location: viewportCoords,
			placement: OpenSeadragon.Placement.CENTER,
		});

		setTimeout(() => {
			viewer.removeOverlay(highlight);
		}, 1800); // Remove after animation
	}

	input.addEventListener("input", () => {
		const value = input.value.toLowerCase();
		suggestionsBox.innerHTML = "";

		if (value.length === 0) return;

		const matches = flatLocations.filter((loc) =>
			loc.name.toLowerCase().includes(value)
		);

		matches.slice(0, 10).forEach((match) => {
			const div = document.createElement("div");
			// div.textContent = match.name;
			const startIndex = match.name.toLowerCase().indexOf(value);
			if (startIndex !== -1) {
				const endIndex = startIndex + value.length;
				const highlighted =
					match.name.substring(0, startIndex) +
					"<strong style='color:#0af'>" +
					match.name.substring(startIndex, endIndex) +
					"</strong>" +
					match.name.substring(endIndex);
				div.innerHTML = highlighted;
			}

			div.addEventListener("click", () => {
				input.value = match.name;
				suggestionsBox.innerHTML = "";
				jumpToLocation(match.coords);
			});
			suggestionsBox.appendChild(div);
		});
	});

	// Hide suggestions if clicked outside
	document.addEventListener("click", (e) => {
		if (!input.contains(e.target)) suggestionsBox.innerHTML = "";
	});
});
