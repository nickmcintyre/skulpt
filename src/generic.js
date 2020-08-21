/**
 * @namespace Sk.generic
 * 
 * @description
 * Some useful default methods for native classes
 * 
 */
Sk.generic = {};

/** @typedef {Sk.builtin.object} */ var pyObject;
/** @typedef {Sk.builtin.type|Function} */ var typeObject;

/**
 * @method
 * 
 * @param {Sk.builtin.str} pyName Python string name of the attribute
 * @param {boolean=} canSuspend Can we return a suspension?
 * 
 * @description
 * The default implementation of __getattribute__. This is used by most instances and will be inherited from object.
 * 
 * If undefined is returned by this method then the object has no attribute
 * It is the responsibility of the user to throw the error. 
 * Currently this is thrown in Sk.abstr.gattr or directly in compile code
 * 
 * @return {Sk.builtin.object|undefined}
 */
Sk.generic.getAttr = function __getattribute__(pyName, canSuspend) {
    let f;
    const type = this.ob$type;
    const descr = type.$typeLookup(pyName);
    // look in the type for a descriptor
    if (descr !== undefined) {
        f = descr.tp$descr_get;
        if (f && Sk.builtin.checkDataDescr(descr)) {
            return f.call(descr, this, type, canSuspend);
        }
    }

    const dict = this.$d;

    if (dict !== undefined) {
        const res = dict.quick$lookup(pyName);
        if (res !== undefined) {
            return res;
        }
    }
    if (f) {
        return f.call(descr, this, type, canSuspend);
    }
    if (descr != null) {
        return descr;
    }
    return;
};
Sk.exportSymbol("Sk.generic.getAttr", Sk.generic.getAttr);

/**
 * @method
 * 
 * @description
 * The default implementation of __setattr__/__delattr__ used by most instance objects
 * There is no return value for this function
 * An error will be thrown if no attribute exists
 * 
 * A value=undefined signifies that the attribute is to be deleted
 * 
 * @param {Sk.builtin.str} pyName
 * @param {Sk.builtin.object|undefined} value
 * @param {boolean=} canSuspend ? can this function suspend
 * @return {undefined}
 */
Sk.generic.setAttr = function __setattr__(pyName, value, canSuspend) {
    const descr = this.ob$type.$typeLookup(pyName); 
    // otherwise, look in the type for a descr
    if (descr !== undefined && descr !== null) {
        const f = descr.tp$descr_set;
        // todo; is this the right lookup priority for data descriptors?
        if (f) {
            return f.call(descr, this, value, canSuspend);
        }
    }

    const dict = this.$d;
    if (dict !== undefined) {
        if (dict.mp$ass_subscript) {
            if (value !== undefined) {
                return dict.mp$ass_subscript(pyName, value);
            } else {
                try {
                    return dict.mp$ass_subscript(pyName);
                } catch (e) {
                    if (e instanceof Sk.builtin.KeyError) {
                        throw new Sk.builtin.AttributeError("'" + Sk.abstr.typeName(this) + "' object has no attribute '" + pyName.$jsstr() + "'");
                    }
                    throw e;
                }
            }
        } else if (typeof dict === "object") {
            const jsMangled = pyName.$mangled;
            if (value !== undefined) {
                dict[jsMangled] = value;
                return;
            } else if (dict[jsMangled] !== undefined) {
                delete dict[jsMangled];
                return;
            }
        }
    }
    throw new Sk.builtin.AttributeError("'" + Sk.abstr.typeName(this) + "' object has no attribute '" + pyName.$jsstr() + "'");
};
Sk.exportSymbol("Sk.generic.setAttr", Sk.generic.setAttr);


/**
 * @method
 * 
 * @description
 * The default implementation of tp$new for builtin type objects that are mutable
 * args and kwargs are ignored
 * either a new instance of the builtin is returned or an instance of a subtype
 * 
 * @see {Sk.builtin.type.prototype.tp$new}
 * 
 * @param {typeObject} builtin 
 */
Sk.generic.new = function (builtin) {
    const genericNew = function __new__(args, kwargs) {
        // this = prototype of an sk$type object.
        if (this === builtin.prototype) {
            return new this.constructor();
        } else {
            const instance = new this.constructor();
            // now we want to apply instance to the builtin
            builtin.call(instance);
            return instance;
        }
    };
    return genericNew;
};

/**
 * @method
 * 
 * @description
 * method definitaion for __new__ that wraps tp$new
 * typically called by subtypes using super().__new__(args, kwargs)
 * 
 * the algorithm follows Cpython
 * 
 * @see {Sk.slots.__new__}
 * 
 */
Sk.generic.newMethodDef = {
    $meth: function (args, kwargs) {
        // this = a type object
        let this_name, subs_name;
        const native_type_proto = this.prototype; 

        if (args.length < 1) {
            this_name = native_type_proto.tp$name;
            throw new Sk.builtin.TypeError(this_name + ".__new__(): not enough arguments");
        }

        const subtype = args.shift();

        if (subtype.sk$type === undefined) {
            this_name = native_type_proto.tp$name;
            throw new Sk.builtin.TypeError(this_name + "__new__(X): X is not a type object (" + Sk.abstr.typeName(subtype) + ")");
        }

        if (!subtype.$isSubType(this)) {
            this_name = native_type_proto.tp$name;
            subs_name = subtype.prototype.tp$name;
            throw new Sk.builtin.TypeError(this_name + ".__new__(" + subs_name + "): " + subs_name + " is not a subtype of " + this_name);
        }
        /* from CPython: Check that the use doesn't do something silly and unsafe like
       object.__new__(dict).  To do this, we check that the
       most derived base that's not a heap type is this type. */
        let static_proto = subtype.prototype;
        let is_static_new = static_proto.hasOwnProperty("tp$new") ? static_proto.tp$new.sk$static_new : false;
        while (!is_static_new) {
            static_proto = static_proto.tp$base.prototype;
            is_static_new = static_proto.hasOwnProperty("tp$new") ? static_proto.tp$new.sk$static_new : false;
        }
        if (static_proto.tp$new !== native_type_proto.tp$new) {
            this_name = native_type_proto.tp$name;
            subs_name = subtype.prototype.tp$name;
            const suitable = static_proto.tp$name;
            throw new Sk.builtin.TypeError(this_name + ".__new__(" + subs_name + ") is not safe, use " + suitable + ".__new__()");
        }
        return native_type_proto.tp$new.call(subtype.prototype, args, kwargs);
    },
    $flags: { FastCall: true },
    $textsig: "($type, *args, **kwargs)",
    $name: "__new__",
};

/**
 * @description
 * used by most iterators that return self
 * 
 * @function
 */
Sk.generic.selfIter = function __iter__() {
    return this;
};

/**
 * @method
 *
 * @description
 * the $seq of the iterator must be an array
 * $orig must be provided and must have a get$size private method
 * note we do not use sq$length since this can be override by subclasses
 * 
 * typically used by mutable iterators like dict_iter_ and set_iter_
 */
Sk.generic.iterNextWithArrayCheckSize = function __next__() {
    if (this.$seq.length !== this.$orig.get$size()) {
        const error_name = this.tp$name.split("_")[0];
        throw new Sk.builtin.RuntimeError(error_name + " changed size during iteration");
    } else if (this.$index >= this.$seq.length) {
        return undefined;
    } 
    return this.$seq[this.$index++];
};

/**
 * @method
 *
 * @description
 * the $seq of the iterator must be an array
 */
Sk.generic.iterNextWithArray = function __next__() {
    if (this.$index >= this.$seq.length) {
        this.tp$iternext = () => undefined; // consumed iterator
        return undefined;
    }
    return this.$seq[this.$index++];
};

/**
 * @method
 * 
 * @description
 * compares the $seq.length to the $index
 */
Sk.generic.iterLengthHintWithArrayMethodDef = {
    $meth: function __length_hint__() {
        return new Sk.builtin.int_(this.$seq.length - this.$index);
    },
    $flags: { NoArgs: true },
};

/**
 * @method
 * 
 * @description
 * returns the current index
 */
Sk.generic.iterReverseLengthHintMethodDef = {
    $meth: function __length_hint__() {
        return new Sk.builtin.int_(this.$index);
    },
    $flags: { NoArgs: true },
};


/**
 * @description
 * typical implementation of `__dict__` for type objects that support it
 */
Sk.generic.getSetDict = {
    $get: function () {
        return this.$d;
    },
    $set: function (value) {
        if (!(value instanceof Sk.builtin.dict)) {
            throw new Sk.builtin.TypeError("__dict__ must be set to a dictionary, not a '" + Sk.abstr.typeName(value) + "'");
        }
        this.$d = value;
    },
    $doc: "dictionary for instance variables (if defined)",
    $name: "__dict__",
};
