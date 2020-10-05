const m_workZone    = document.getElementById("hex_grid");                                              //переменная для обновления содержимой векторной графики в svg
const m_domainInfo = document.querySelector("#domainInfo > tbody");                                    //переменная таблицы 
const m_autoFillRegion = document.getElementById("autoFillRegion");
const m_domainInfoRegion = document.getElementById("domainInfo");
const m_neighbors   = [[+1, -1, 0], [0, -1, +1], [-1, 0, +1], [-1, +1, 0], [0, +1, -1], [+1, 0, -1]];   //массив со всеми возможными вариантам координат для поиска соседей выбранного гексогена

let l,           //соответствует длине L на рисунке. Вводится пользователем
    m,           //соответствует длине M на рисунке. Вводится пользователем
    n,           //соответствует длине N на рисунке. Вводится пользователем
    probability, //вероятность заполнения гексогена при АВТО. Вводится пользователем 
    hexGrid,     //массив координат гексогенов в гексогональной решетке.
    randomProb;  //машинная вероятность, которая выпадает при каждой итерации на АВТО.

let m_domainElements = {},      //словарь доменов и гексогенов, входящих в состав соответствующих доменов
    m_domainCellsCnt = 0,       //общее количество ячеек в решетке
    m_trueDomainCellsCnt = 0;   //количество ячеек в решетке, имеющих значение 1 

//функция создания решетки по нажатию на кнопку "Построить сетку"
function CreateHexagonGrid() {

    ResetVariables();

    const m_svg = document.querySelector("#hex_grid > svg");
    setAttributes(m_svg, { "viewBox": (n + ((l + m - 1) / 2)) * 200 / (-2) + " " + (l + m) * 200 / (-2) + " " + (n + ((l + m - 1) / 2)) * 200 + " " + (l + m) * 200, "style": "max-width: 30rem; background-color: gray;" });

    let dx = Math.floor((l + m - 1) / 2);
    let dy, dz;

    if (l == m && m == n && l == n) {
        dy = m - 1;
        dz = dy;
    }
    else if (l == m) {
        dy = Math.cecil(n / 2);
        dz = dy;
    }
    else {
        if (l < m) {
            dy = Math.floor((n + Math.floor(n / Math.PI) - 1) / 2);
            dz = dy + (m + l - 1 - dx) - l;
        }
        else {
            dz = Math.floor((n + Math.floor(n / Math.PI) - 1) / 2);
            dy = dz + (m + l - 1 - dx) - m;
        }
    }

    hexGrid = initGrid(dx, dy, dz);
    drawGrid(hexGrid);
    m_autoFillRegion.style.display = "table";
}

//Вычисление координат ячеек
function initGrid(lSize, mSize, nSize) {
    let gridArray = [];

    for (let i = -lSize; i < lSize + 1; i++)
        for (let j = -mSize; j < mSize + 1; j++)
            for (let k = -nSize; k < nSize + 1; k++)
                if (i + j + k == 0)
                    gridArray.push(new HexCell(i, j, k)); //помещаем в массив объект с описанными в экземпляре ключами и значениями - координатами
    
    return gridArray;
}

//экземплляр gridArray. 
function HexCell(x, y, z) {
    this._x = x;
    this._y = y;
    this._z = z;
}

//отрисовка самой сетки на основании сформированного массива
function drawGrid(gridArray) {
    const m_gParent = document.querySelector("#hex_grid > svg > g");
    m_gParent.innerHTML = "";

    let x, y, z, posX, posY;

    for (let i = 0; i < gridArray.length; i++) {
        x = gridArray[i]._x;
        y = gridArray[i]._y;
        z = gridArray[i]._z;
        posX = x * 150;
        posY = (-y + z) * 85;

        const m_hex = document.createElement("g");
        setAttributes(m_hex, { "transform": "translate(" + posX + ", " + posY + ")", "id": "hex_" + i });

        const m_pol = document.createElement("polygon");
        setAttributes(m_pol, { "points": "100,0 50,-85 -50,-87 -100,0 -50,87 50,87" });

        const cellValue = document.createElement("text");
        setAttributes(cellValue, { "transform": "rotate(90)", "x": "-10", "y": "20", "fill": "black", "font-size": "0px" });
        cellValue.innerText = "1";
        
        m_hex.appendChild(m_pol);
        m_hex.appendChild(cellValue);
        m_gParent.appendChild(m_hex);
    }
    //обновление HTML для отображения результата цикла выше
    document.getElementById("hex_grid").innerHTML += "";

    //каждому из соданных элементов присваиваем ивент клика
    document.querySelectorAll("#hex_grid > svg > g > g").forEach(
        element => element.addEventListener("click",
            (event) => {
                SetDomain(event.target.parentElement, false);
            }
        )
    );
}

//устанавливаем домен
function SetDomain(element, autoFill) {
    //если не автозаполнение, то проверяем ячейку на наличие его в каком либо домене
    if (!autoFill) {
        for (const value in m_domainElements) {
            for (let i = 0; i < m_domainElements[value].length; i++) {
                if (m_domainElements[value][i] == element) {
                    //если находим, то исключаем его
                    RemoveElementFromDomain(value, i);
                    return;
                }
            }
        }
    }

    //если ячейка не была отмечена ранее, то проверяем ее на соседей. Есть ли возможность включить ее в уже существующий домен
    for (const value in m_domainElements) {
        for (let i = 0; i < m_domainElements[value].length; i++) {
            let isNeightbour = CheckForNeightbour(m_domainElements[value][i], element)
            if (isNeightbour) {
                AddElementToDomain(element, value, autoFill);
                return;
            }
        }
    }

    //если она не является ничьи соседом, то создаем новый домен и добавлем туда выбранную ячейку
    let domainColor = '#' + (Math.random().toString(16) + '000000').substring(2, 8).toUpperCase();
    m_domainElements[domainColor] = [];
    AddElementToDomain(element, domainColor, autoFill);
}

//добавить ячейку к домену
function AddElementToDomain(newElement, domain, autoFill) {
    newElement.children[1].setAttribute("font-size", "50px");
    newElement.style.fill = domain;
    m_domainElements[domain].push(newElement);
    m_domainCellsCnt++;
    if (autoFill)
        AddInfoIntoTable();
}

//удаляем элемент из домена
function RemoveElementFromDomain(domain, i) {
    m_domainElements[domain][i].children[1].setAttribute("font-size", "0px");
    m_domainElements[domain][i].style.fill = "white";
    m_domainCellsCnt--;
    m_domainElements[domain].splice(i, 1);

    //если количество яччек в домене 0, то домен удаляется
    if (m_domainElements[domain].length == 0)
        delete m_domainElements[domain];
}

//Проверка выбранной ячейки на соседство с другими
function CheckForNeightbour(curDomenElement, newElement) {
    let startIndex = "hex_".length;
    let curDomenElementId = parseInt(curDomenElement.id.substr(startIndex));
    let newElementId = parseInt(newElement.id.substr(startIndex));

    for (let j = 0; j < m_neighbors.length; j++) {
        let dx = hexGrid[curDomenElementId]._x - hexGrid[newElementId]._x + m_neighbors[j][0];
        let dy = hexGrid[curDomenElementId]._y - hexGrid[newElementId]._y + m_neighbors[j][1];
        let dz = hexGrid[curDomenElementId]._z - hexGrid[newElementId]._z + m_neighbors[j][2];

        if (dx == 0 && dy == 0 && dz == 0)
            return true;
    }
}

//Добавляем информацию в таблиицу
function AddInfoIntoTable() {
    const newTableRow = document.createElement("tr");
    for (let i = 0; i < 4; i++) {
        const newTableCell = document.createElement("td");
        let cellInfo;
        switch (i) {
            case 0:
                cellInfo = randomProb + " %";
                break;
            case 1:
                cellInfo = Object.keys(m_domainElements).length;
                break;
            case 2:
                cellInfo = "???";
                break;
            case 3:
                cellInfo = m_domainCellsCnt;
                break;
        }
        newTableCell.innerText = cellInfo;
        newTableRow.appendChild(newTableCell);
    }
    if (m_domainInfo.children.length == 10)
        m_domainInfo.removeChild(m_domainInfo.children[0]);
    m_domainInfo.appendChild(newTableRow);
}

//Автозаполнение 
function AutoFilling() {

    ResetVariables();

    document.querySelectorAll("#hex_grid > svg > g > g").forEach((element) => {
        randomProb = Math.ceil(Math.random() * 100);
        if (randomProb <= probability)
            SetDomain(element, true);
    });
    m_domainInfoRegion.style.display = "table";
}

//Отображение инпутного значение и его присвоения в переменную
function SetInputVisualInfo(value, param) {
    document.getElementById(param + "_Info").innerText = value;
    if (param == "probability")
        document.getElementById(param + "_Info").innerText += " %";

    switch (param) {
        case "L":
            l = parseInt(value);
            break;
        case "M":
            m = parseInt(value);
            break;
        case "N":
            n = parseInt(value);
            break;
        case "probability":
            probability = parseInt(value);
            break;
        default:
            break;
    }
}

//Сброс значения переменных
function ResetVariables() {
    m_domainInfo.innerHTML = "";
    m_domainCellsCnt = 0;
    for (const value in m_domainElements) {
        for (let i = 0; i < m_domainElements[value].length; i++) {
            m_domainElements[value][i].style.fill = "white";
            m_domainElements[value][i].children[1].setAttribute("font-size", "0px");
        }
    }
    m_domainElements = {};
}

//Вспомогательная функция для удобного добавления атрибутов
function setAttributes(element, attrs) {
    for (let key in attrs)
        element.setAttribute(key, attrs[key]);
}


window.onload = () => {
    SetInputVisualInfo(document.getElementById("L_Input").value, "L");
    SetInputVisualInfo(document.getElementById("M_Input").value, "M");
    SetInputVisualInfo(document.getElementById("N_Input").value, "N");
    SetInputVisualInfo(document.getElementById("probability_Input").value, "probability");
}
