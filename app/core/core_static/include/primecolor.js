/*
primecolor.js
Copyright 2014-2015 Edward L. Platt <ed@elplatt.com>
Distributed under BSD 3-clause license
*/
PrimeColor = {
    seed: { "red": 0, "green": 0, "blue": 0 },
    setSeed: function (r, g, b) {
        this.seed = {
            "red": r,
            "green": g,
            "blue": b
        }
    },
    getColorHex: function (i) {
        var r = (i * 63) % 256;
        var g = (i * 101) % 256;
        var b = (i * 167) % 256;
        r = (r + this.seed.red) % 256;
        g = (g + this.seed.green) % 256;
        b = (b + this.seed.blue) % 256;
        rh = r.toString(16);
        if (rh.length == 1) { rh = "0" + rh; }
        gh = g.toString(16);
        if (gh.length == 1) { gh = "0" + gh; }
        bh = b.toString(16);
        if (bh.length == 1) { bh = "0" + bh; }
        return "#" + rh + gh + bh;
    }
}