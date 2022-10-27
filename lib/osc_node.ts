import { OSCTypeSimple, OSCType, OSCQClipmode, OSCQRange, OSCQAccess } from "./osc_types";
import { SerializedNode } from "./serialized_node";
import { OSCMethodArgument, OSCMethodDescription } from "./osc_method_description";

function generateValue(type: OSCType, arg: OSCMethodArgument): unknown {
	if (Array.isArray(type)) {
		return type.map(t => generateValue(t, arg));
	}

	if (arg.value) {
		return arg.value;
	}

	switch(type) {
		case OSCTypeSimple.INT:
		case OSCTypeSimple.FLOAT:
		case OSCTypeSimple.BIGINT:
		case OSCTypeSimple.DOUBLE:
		case OSCTypeSimple.TIMETAG:
			if (arg.range?.min !== undefined) { // if a range is defined just return the lower bound
				return arg.range.min;
			} else if (arg.range?.max !== undefined) { // if a range is defined or the upper bound if we only have that
				return arg.range.max;
			} else if (arg.range?.vals !== undefined && arg.range?.vals.length > 0) { // maybe we have some predefined values to return?
				return arg.range.vals[0];
			} else { // otherwise just return 1
				return 1;
			}
		case OSCTypeSimple.STRING:
		case OSCTypeSimple.ALTSTRING:
		case OSCTypeSimple.CHAR:
			if (arg.range?.vals !== undefined && arg.range?.vals.length > 0) {
				return arg.range.vals[0];
			} else {
				return "a"; // this is both a string and also a char
			}
		case OSCTypeSimple.COLOR:
			return "#FFFFFFFF";
		case OSCTypeSimple.BLOB:
		case OSCTypeSimple.MIDI:
		case OSCTypeSimple.NIL:
		case OSCTypeSimple.INFINITUM:
			return null;
		case OSCTypeSimple.TRUE:
			return true;
		case OSCTypeSimple.FALSE:
			return false;
	}
}

function getTypeString(type: OSCType): string {
	if (Array.isArray(type)) {
		return "[" + type.map(getTypeString).join("") + "]";
	} else {
		return type;
	}
}

function assembleFullPath(node: OSCNode): string {
	if (node.parent == null) {
		return "";
	} else {
		return assembleFullPath(node.parent) + "/" + node.name;
	}
}

export class OSCNode {
	private _parent?: OSCNode;
	private _name: string;
	private _description?: string;
	private _access?: OSCQAccess;
	private _tags?: string[];
	private _critical?: boolean;
	private _args?: OSCMethodArgument[];
	private _children: Record<string, OSCNode> = {};

	constructor(name: string, parent?: OSCNode) {
		this._name = name;
		this._parent = parent;
	}

	// null -> is root
	get parent(): OSCNode | null {
		if (this._parent) {
			return this._parent;
		} else {
			return null;
		}
	}

	get name(): string {
		return this._name;
	}

	setOpts(desc: OSCMethodDescription) {
		this._description = desc.description;
		this._access = desc.access;
		this._tags = desc.tags;
		this._critical = desc.critical;
		this._args = desc.arguments;
	}

	isEmpty() { // if there are no arguments and no children the node is empty
		return !this._args && Object.keys(this._children).length == 0;
	}

	isContainer() {
		return !this._args  && Object.keys(this._children).length > 0;
	}

	addChild(path: string, node: OSCNode) {
		if (path in this._children) {
			throw new Error(`The child ${path} already exist`);
		}

		this._children[path] = node;
	}

	hasChild(path: string) {
		return path in this._children;
	} 

	getChild(path: string) {
		return this._children[path];
	}

	removeChild(path: string) {
		if (this.hasChild(path)) {
			delete this._children[path];
		}
	}

	getOrCreateChild(path: string) {
		if (!this.hasChild(path)) {
			this._children[path] = new OSCNode(path, this);	
		}

		return this._children[path];
	}

	serialize(full_path: string | null = null) {
		full_path = assembleFullPath(this);

		const result: SerializedNode = {
			FULL_PATH: full_path || "/",
		};

		if (this._description) result.DESCRIPTION = this._description;
		if (this._access) {
			result.ACCESS = this._access;
		} else if (this.isContainer()) {
			result.ACCESS = OSCQAccess.NO_VALUE;
		}
		if (this._tags) result.TAGS = this._tags;
		if (this._critical) result.CRITICAL = this._critical;

		if (Object.keys(this._children).length > 0) {
			result.CONTENTS = Object.fromEntries(Object.entries(this._children).map(([name, node]) => {
				return [ name, node.serialize(full_path + "/" + name) ]
			}));
		}

		if (this._args) {
			let arg_types: string = "";
			// these are set to null in case one of the args doesn't specify them
			let arg_ranges: OSCQRange[] | null = [];
			let arg_clipmodes: OSCQClipmode[] | null = [];
			const arg_values: unknown[] = [];

			for (const arg of this._args) {
				arg_types += getTypeString(arg.type);
				arg_values.push(generateValue(arg.type, arg));

				if (arg_ranges !== null && arg.range) {
					arg_ranges.push(arg.range);
				} else if (!arg.range) { // if one of the args doesn't specify a range, the generation of the range field is disabled
					arg_ranges = null;
				}

				if (arg_clipmodes !== null && arg.clipmode) {
					arg_clipmodes.push(arg.clipmode);
				} else if (!arg.clipmode) { // if one of the args doesn't specify a clipmode, the generation of the range field is disabled
					arg_clipmodes = null;
				}
			}

			result.TYPE = arg_types;

			if (arg_ranges) {
				result.RANGE = arg_ranges.map(range => ({
					MAX: range.max,
					MIN: range.min,
					VALS: range.vals,
				}));
			}

			if (arg_clipmodes) result.CLIPMODE = arg_clipmodes;

			if (this._access && (this._access == 1 || this._access == 3)) {
				result.VALUE = arg_values;
			}
		}

		return result;
	}
}