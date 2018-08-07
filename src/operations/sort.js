export function sortList(list, option) {
    for (let field in option) {
        list = list.sort(predicateBy(field, option[field]));
    }

    return list;
}

function predicateBy(property, mode) {
    return (a, b) => {
        if (a[property] > b[property]) {
            return 1 * mode;
        } else if (a[property] < b[property]) {
            return -1 * mode;
        }
        return 0;
    }
}