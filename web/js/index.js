const socket = io();
const game = document.querySelector(".game");
const position = [0, 0];

let positionChanged = false;

socket.on("connect", () => {
	document.querySelectorAll(".cursor").forEach(cursor => cursor.remove());
	document.querySelector(".player_list").innerHTML = "";
});

socket.on("cursor add", id => {
	const cursor = document.createElement("div");
	cursor.classList.add("cursor");
	cursor.classList.add(`cursor_${id}`);
	const cursorName = document.createElement("div");
	cursorName.classList.add("cursor_name");
	cursorName.classList.add(`cursor_name_${id}`);
	cursor.appendChild(cursorName);
	const cursorStorage = document.createElement("div");
	cursorStorage.classList.add("cursor_storage");
	cursorStorage.classList.add(`cursor_storage_${id}`);
	cursor.appendChild(cursorStorage);
	const cursorPower = document.createElement("div");
	cursorPower.classList.add("cursor_power");
	cursorPower.classList.add(`cursor_power_${id}`);
	cursor.appendChild(cursorPower);
	const cursorMoney = document.createElement("div");
	cursorMoney.classList.add("cursor_money");
	cursorMoney.classList.add(`cursor_money_${id}`);
	cursor.appendChild(cursorMoney);
	if (id === socket.id) cursor.style.backgroundColor = "#0003";
	game.appendChild(cursor);
	const listItem = document.createElement("li");
	listItem.classList.add(`list_${id}`);
	listItem.innerHTML = `<span class="list_name_${id}"></span> - <span class="list_money_${id}"></span>`;
	document.querySelector(".player_list").appendChild(listItem);
});

socket.on("cursor remove", id => {
	const cursor = document.querySelector(`.cursor_${id}`);
	cursor.remove();
	const listItem = document.querySelector(`.list_${id}`);
	listItem.remove();
});

socket.on("cursor data", (id, data) => {
	if (data.position !== undefined) {
		const cursor = document.querySelector(`.cursor_${id}`);
		cursor.style.left = data.position[0] + "px";
		cursor.style.top = data.position[1] + "px";
	}
	if (data.name !== undefined) {
		const cursorName = document.querySelector(`.cursor_name_${id}`);
		cursorName.innerText = data.name;
		if (id === socket.id) document.querySelector(".name").innerText = data.name;
		document.querySelector(`.list_name_${id}`).innerText = data.name;
	}
	if (data.storage !== undefined) {
		const cursorStorage = document.querySelector(`.cursor_storage_${id}`);
		cursorStorage.innerText = `${formatNumber(data.storage[0])}/${formatNumber(data.storage[1])}`;
		if (id === socket.id) document.querySelector(".storage").innerText = `${formatNumber(data.storage[0])}/${formatNumber(data.storage[1])}`;
	}
	if (data.power !== undefined) {
		const cursorPower = document.querySelector(`.cursor_power_${id}`);
		cursorPower.innerText = formatNumber(data.power);
		if (id === socket.id) document.querySelector(".power").innerText = formatNumber(data.power);
	}
	if (data.money !== undefined) {
		const cursorMoney = document.querySelector(`.cursor_money_${id}`);
		cursorMoney.innerText = `$${formatNumber(data.money)}`;
		if (id === socket.id) document.querySelector(".money").innerText = `$${formatNumber(data.money)}`;
		document.querySelector(`.list_money_${id}`).innerText = `$${formatNumber(data.money)}`;
	}
});

socket.on("chat", (author, message) => {
	const chatRow = document.createElement("div");
	const chatAuthor = document.createElement("span");
	chatAuthor.classList.add("chat_author");
	chatAuthor.innerText = author;
	chatRow.appendChild(chatAuthor);
	const chatMessage = document.createElement("span");
	chatMessage.classList.add("chat_message");
	chatMessage.innerText = message;
	chatRow.appendChild(chatMessage);
	document.querySelector(".chat_messages").prepend(chatRow);
});

game.onmousemove = event => {
	const x = Math.floor(event.clientX - game.getBoundingClientRect().x);
	const y = Math.floor(event.clientY - game.getBoundingClientRect().y);

	position[0] = x;
	position[1] = y;
	positionChanged = true;
};

setInterval(() => {
	if (positionChanged) {
		socket.emit("position", [position[0], position[1]]);
		positionChanged = false;
	}
}, 100);

document.querySelector(".upgrade_button").onclick = () => {
	socket.emit("upgrade storage", parseFormattedInt(document.querySelector(".storage_upgrade").value));
	socket.emit("upgrade power", parseFormattedInt(document.querySelector(".power_upgrade").value));
};

document.querySelector(".login").onclick = () => {
	if (document.querySelector(".login").innerText === "Login/Register") {
		document.querySelector(".username").disabled = true;
		document.querySelector(".password").disabled = true;
		socket.emit("login", document.querySelector(".username").value, document.querySelector(".password").value);
		document.querySelector(".login").innerText = "Logout";
	} else {
		document.querySelector(".username").disabled = false;
		document.querySelector(".password").disabled = false;
		socket.emit("logout");
		document.querySelector(".login").innerText = "Login/Register";
	}
};

document.querySelector(".send_chat").onclick = () => {
	socket.emit("chat", document.querySelector(".chat_input").value);
	document.querySelector(".chat_input").value = "";
};

document.querySelector(".chat_input").onkeydown = event => {
	if (event.key === "Enter") {
		document.querySelector(".send_chat").click();
	}
};

onresize = () => {
	document.body.style.marginTop = `${(innerHeight - 602) / 2}px`;
	document.body.style.marginLeft = `${(innerWidth - 1104) / 2}px`;
};
onresize();

document.querySelector(".sidebar_option_info").onclick = () => switchSidebar("info");
document.querySelector(".sidebar_option_list").onclick = () => switchSidebar("list");
document.querySelector(".sidebar_option_chat").onclick = () => switchSidebar("chat");
document.querySelector(".sidebar_option_changelog").onclick = () => switchSidebar("changelog");

switchSidebar("info");

function switchSidebar(name) {
	Array.from(document.querySelector(".sidebar_options").children).forEach(sidebarOption => sidebarOption.style.textDecoration = null);
	Array.from(document.querySelector(".sidebar_contents").children).forEach(sidebarContent => sidebarContent.style.display = "none");
	document.querySelector(`.sidebar_option_${name}`).style.textDecoration = "underline";
	document.querySelector(`.sidebar_content_${name}`).style.display = null;
}

function formatNumber(number, i) {
	const suffixes = ["k", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "Ud", "Dd", "Td", "Qad", "Qid", "Sxd", "Spd", "Ocd", "Nod", "Vg", "Uvg", "Dvg", "Tvg", "Qavg", "Qivg", "Sxvg", "Spvg", "Ocvg", "Novg", "Tg", "Utg", "Dtg", "Ttg", "Qatg", "Qitg", "Sxtg", "Sptg", "Octg", "Notg", "Qag", "Uqag", "Dqag", "Tqag", "Qaqag", "Qiqag", "Sxqag", "Spqag", "Ocqag", "Noqag", "Qig", "UQig", "DQig", "TQig", "QaQig", "QiQig", "SxQig", "SpQig", "OcQig", "NoQig", "Sxg", "USxg", "DSxg", "TSxg", "QaSxg", "QiSxg", "SxSxg", "SpSxg", "OcSxg", "NoSxg", "Spg", "USpg", "DSpg", "TSpg", "QaSpg", "QiSpg", "SxSpg", "SpSpg", "OcSpg", "NoSpg", "Ocg", "UOcg", "DOcg", "TOcg", "QaOcg", "QiOcg", "SxOcg", "SpOcg", "OcOcg", "NoOcg", "Nog", "UNog", "DNog", "TNog", "QaNog", "QiNog", "SxNog", "SpNog", "OcNog", "NoNog", "C", "Uc"];
	number = Math.floor(number);
	if (i === undefined) i = -1;
	if (number === Infinity) return "Infinity";
	if (number >= 1000 || number <= -1000) return formatNumber(Math.floor(number / 1000), ++i);
	else return number + (i !== -1 ? suffixes[i] : "");
}

function parseFormattedInt(string) {
	const suffixes = ["k", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "Ud", "Dd", "Td", "Qad", "Qid", "Sxd", "Spd", "Ocd", "Nod", "Vg", "Uvg", "Dvg", "Tvg", "Qavg", "Qivg", "Sxvg", "Spvg", "Ocvg", "Novg", "Tg", "Utg", "Dtg", "Ttg", "Qatg", "Qitg", "Sxtg", "Sptg", "Octg", "Notg", "Qag", "Uqag", "Dqag", "Tqag", "Qaqag", "Qiqag", "Sxqag", "Spqag", "Ocqag", "Noqag", "Qig", "UQig", "DQig", "TQig", "QaQig", "QiQig", "SxQig", "SpQig", "OcQig", "NoQig", "Sxg", "USxg", "DSxg", "TSxg", "QaSxg", "QiSxg", "SxSxg", "SpSxg", "OcSxg", "NoSxg", "Spg", "USpg", "DSpg", "TSpg", "QaSpg", "QiSpg", "SxSpg", "SpSpg", "OcSpg", "NoSpg", "Ocg", "UOcg", "DOcg", "TOcg", "QaOcg", "QiOcg", "SxOcg", "SpOcg", "OcOcg", "NoOcg", "Nog", "UNog", "DNog", "TNog", "QaNog", "QiNog", "SxNog", "SpNog", "OcNog", "NoNog", "C", "Uc"];
	const number = parseInt(string.replace(/(\d+).+/, "$1"));
	const unit = string.replace(/\d+(.+)/, "$1");
	const i = suffixes.indexOf(unit) + 1;
	return 1000 ** i * number;
}