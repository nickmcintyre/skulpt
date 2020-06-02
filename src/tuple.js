/**
 * @constructor
 * @param {Array} L
 */
Sk.builtin.tuple = function (L) {
    if (L === undefined) {
        L = [];
    }
    Sk.asserts.assert(Array.isArray(L) && this instanceof Sk.builtin.tuple, "bad call to tuple, use 'new' with an Array");
    this.v = L;
};

Sk.abstr.setUpInheritance("tuple", Sk.builtin.tuple, Sk.builtin.object);
Sk.builtin.tuple.prototype.tp$as_sequence_or_mapping = true;

Sk.builtin.tuple.prototype.tp$doc =
    "Built-in immutable sequence.\n\nIf no argument is given, the constructor returns an empty tuple.\nIf iterable is specified the tuple is initialized from iterable's items.\n\nIf the argument is a tuple, the return value is the same object.";

Sk.builtin.tuple.prototype.tp$new = function (args, kwargs) {
    // this will be Sk.builtin.prototype or a prototype that inherits from Sk.builtin.tuple.prototype
    if (this !== Sk.builtin.tuple.prototype) {
        return Sk.builtin.tuple.prototype.$subtype_new.call(this, args, kwargs);
    }
    Sk.abstr.checkNoKwargs("list", kwargs);
    Sk.abstr.checkArgsLen("list", args, 0, 1);
    const L = [];
    const arg = args[0];

    if (arg === undefined) {
        return new Sk.builtin.tuple(L);
    }

    if (arg.ob$type === Sk.builtin.tuple) {
        return arg;
    }

    Sk.misceval.iterFor(Sk.abstr.iter(arg), function (i) {
        L.push(i);
    });

    return new Sk.builtin.tuple(L);
};

Sk.builtin.tuple.prototype.$subtype_new = function (args, kwargs) {
    // should we check that this is indeed a subtype of tuple?
    const instance = new this.constructor();
    // pass the args but ignore the kwargs for subtyping
    const tuple = Sk.builtin.tuple.prototype.tp$new(args);
    instance.v = tuple.v;
    return instance;
};

Sk.builtin.tuple.prototype.sk$asarray = function () {
    return this.v.slice();
};

Sk.builtin.tuple.prototype.$r = function () {
    var ret;
    var i;
    var bits;
    if (this.v.length === 0) {
        return new Sk.builtin.str("()");
    }
    bits = [];
    for (i = 0; i < this.v.length; ++i) {
        bits[i] = Sk.misceval.objectRepr(this.v[i]).v;
    }
    ret = bits.join(", ");
    if (this.v.length === 1) {
        ret += ",";
    }
    return new Sk.builtin.str("(" + ret + ")");
};

Sk.builtin.tuple.prototype.mp$subscript = function (index) {
    var ret;
    var i;
    if (Sk.misceval.isIndex(index)) {
        i = Sk.misceval.asIndex(index);
        if (typeof i !== "number") {
            throw new Sk.builtin.IndexError("cannot fit '" + Sk.abstr.typeName(index) + "' into an index-sized integer");
        }
        if (i !== undefined) {
            if (i < 0) {
                i = this.v.length + i;
            }
            if (i < 0 || i >= this.v.length) {
                throw new Sk.builtin.IndexError("tuple index out of range");
            }
            return this.v[i];
        }
    } else if (index instanceof Sk.builtin.slice) {
        ret = [];
        index.sssiter$(this, function (i, wrt) {
            ret.push(wrt.v[i]);
        });
        return new Sk.builtin.tuple(ret);
    }

    throw new Sk.builtin.TypeError("tuple indices must be integers, not " + Sk.abstr.typeName(index));
};

// todo; the numbers and order are taken from python, but the answer's
// obviously not the same because there's no int wrapping. shouldn't matter,
// but would be nice to make the hash() values the same if it's not too
// expensive to simplify tests.
Sk.builtin.tuple.prototype.tp$hash = function () {
    var y;
    var i;
    var mult = 1000003;
    var x = 0x345678;
    var len = this.v.length;
    for (i = 0; i < len; ++i) {
        y = Sk.builtin.hash(this.v[i]).v;
        if (y === -1) {
            return new Sk.builtin.int_(-1);
        }
        x = (x ^ y) * mult;
        mult += 82520 + len + len;
    }
    x += 97531;
    if (x === -1) {
        x = -2;
    }
    return new Sk.builtin.int_(x | 0);
};

Sk.builtin.tuple.prototype.sq$repeat = function (n) {
    var j;
    var i;
    var ret;

    n = Sk.misceval.asIndex(n);
    if (typeof n !== "number") {
        throw new Sk.builtin.OverflowError("cannot fit '" + Sk.abstr.typeName(n) + "' into an index-sized integer");
    }
    ret = [];
    for (i = 0; i < n; ++i) {
        for (j = 0; j < this.v.length; ++j) {
            ret.push(this.v[j]);
        }
    }
    return new Sk.builtin.tuple(ret);
};

// Sk.builtin.tuple.prototype.nb$multiply = Sk.builtin.tuple.prototype.nb$reflected_multiply = Sk.builtin.tuple.prototype.sq$repeat;

Sk.builtin.tuple.prototype.tp$iter = function () {
    return new Sk.builtin.tuple_iter_(this);
};

Sk.builtin.tuple.prototype.tp$richcompare = function (w, op) {
    //print("  tup rc", JSON.stringify(this.v), JSON.stringify(w), op);
    // w not a tuple
    var k;
    var i;
    var wl;
    var vl;
    var v;
    if (!(w instanceof Sk.builtin.tuple)) {
        // shortcuts for eq/not
        if (op === "Eq") {
            return false;
        }
        if (op === "NotEq") {
            return true;
        }

        if (Sk.__future__.python3) {
            return Sk.builtin.NotImplemented.NotImplemented$;
        }
        // todo; other types should have an arbitrary order
        return false;
    }

    v = this.v;
    w = w.v;
    vl = v.length;
    wl = w.length;

    for (i = 0; i < vl && i < wl; ++i) {
        k = Sk.misceval.richCompareBool(v[i], w[i], "Eq");
        if (!k) {
            break;
        }
    }

    if (i >= vl || i >= wl) {
        // no more items to compare, compare sizes
        switch (op) {
            case "Lt":
                return vl < wl;
            case "LtE":
                return vl <= wl;
            case "Eq":
                return vl === wl;
            case "NotEq":
                return vl !== wl;
            case "Gt":
                return vl > wl;
            case "GtE":
                return vl >= wl;
            default:
                Sk.asserts.fail();
        }
    }

    // we have an item that's different

    // shortcuts for eq/not
    if (op === "Eq") {
        return false;
    }
    if (op === "NotEq") {
        return true;
    }

    // or, compare the differing element using the proper operator
    //print("  tup rcb end", i, v[i] instanceof Sk.builtin.str, JSON.stringify(v[i]), w[i] instanceof Sk.builtin.str, JSON.stringify(w[i]), op);
    return Sk.misceval.richCompareBool(v[i], w[i], op);
};

Sk.builtin.tuple.prototype.sq$concat = function (other) {
    var msg;
    if (other.ob$type != Sk.builtin.tuple) {
        msg = 'can only concatenate tuple (not "';
        msg += Sk.abstr.typeName(other) + '") to tuple';
        throw new Sk.builtin.TypeError(msg);
    }

    return new Sk.builtin.tuple(this.v.concat(other.v));
};

// Sk.builtin.tuple.prototype.nb$add = Sk.builtin.tuple.prototype.sq$concat;

Sk.builtin.tuple.prototype.sq$contains = function (ob) {
    var it, i;

    for (it = this.tp$iter(), i = it.tp$iternext(); i !== undefined; i = it.tp$iternext()) {
        if (Sk.misceval.richCompareBool(i, ob, "Eq")) {
            return true;
        }
    }

    return false;
};

Sk.builtin.tuple.prototype.sq$length = function () {
    return this.v.length;
};

Sk.builtin.tuple.prototype.tp$methods = {
    __getnewargs__: {
        $meth: function () {
            return new Sk.builtin.tuple(this.v.slice());
        },
        $flags: { NoArgs: true },
        $textsig: "($self, /)",
        $doc: null,
    },
    index: {
        $meth: function (item, start, stop) {
            // TODO: currently doesn't support start and stop
            var i;
            var len = this.v.length;
            var obj = this.v;
            for (i = 0; i < len; ++i) {
                if (Sk.misceval.richCompareBool(obj[i], item, "Eq")) {
                    return new Sk.builtin.int_(i);
                }
            }
            throw new Sk.builtin.ValueError("tuple.index(x): x not in tuple");
        },
        $flags: { MinArgs: 1, MaxArgs: 3 },
        $textsig: "($self, value, start=0, stop=sys.maxsize, /)",
        $doc: "Return first index of value.\n\nRaises ValueError if the value is not present.",
    },
    count: {
        $meth: function (item) {
            var i;
            var len = this.v.length;
            var obj = this.v;
            var count = 0;
            for (i = 0; i < len; ++i) {
                if (Sk.misceval.richCompareBool(obj[i], item, "Eq")) {
                    count += 1;
                }
            }
            return new Sk.builtin.int_(count);
        },
        $flags: { OneArg: true },
        $textsig: "($self, value, /)",
        $doc: "Return number of occurrences of value.",
    },
};

Sk.abstr.setUpSlots(Sk.builtin.tuple);
Sk.abstr.setUpMethods(Sk.builtin.tuple);
Sk.exportSymbol("Sk.builtin.tuple", Sk.builtin.tuple);
