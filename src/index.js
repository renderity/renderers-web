import getWebgl from './webgl';
import getWebgpu from './webgpu';



export default class Renderers
{
	constructor (wasm_wrapper)
	{
		this.wasm_wrapper = wasm_wrapper;

		const WasmWrapper = this.wasm_wrapper.constructor;

		const renderers = this;



		class Base
		{
			static instances_base = null;
			static instances = null;

			// static getInstance (addr, ...args)
			// {
			// 	const base = renderers[`${ this.name }Base`.replace('_', '')];

			// 	if (base)
			// 	{
			// 		if (!this.instances)
			// 		{
			// 			this.instances = {};
			// 		}

			// 		if (!this.instances[addr])
			// 		{
			// 			Object.defineProperty
			// 			(
			// 				this.instances,

			// 				addr,

			// 				{ value: new this(base?.instances_base?.[addr] || addr, ...args) },
			// 			);
			// 		}

			// 		return this.instances[addr];
			// 	}



			// 	if (!this.instances_base)
			// 	{
			// 		this.instances_base = {};
			// 	}

			// 	if (!this.instances_base[addr])
			// 	{
			// 		Object.defineProperty
			// 		(
			// 			this.instances_base,

			// 			addr,

			// 			{ value: new this(addr, ...args) },
			// 		);
			// 	}

			// 	return this.instances_base[addr];
			// }

			static getInstance (input, ...args)
			{
				// let addr = null;

				// if (typeof input === 'number')
				// {
				// 	addr = input;
				// }
				// else if (typeof input === 'string')
				// {
				// 	[ addr ] = wasm_wrapper.Addr2(input);
				// }

				const addr = input;

				const base = renderers[`${ this.name }Base`.replace('_', '')];

				if (base)
				{
					if (!this.instances)
					{
						this.instances = {};
					}

					if (!this.instances[addr])
					{
						Object.defineProperty
						(
							this.instances,

							addr,

							{ value: new this(base?.instances_base?.[addr] || addr, ...args) },
						);
					}

					return this.instances[addr];
				}



				if (!this.instances_base)
				{
					this.instances_base = {};
				}

				if (!this.instances_base[addr])
				{
					Object.defineProperty
					(
						this.instances_base,

						addr,

						{ value: new this(addr, ...args) },
					);
				}

				return this.instances_base[addr];
			}

			// Use for dynamically allocated obejcts to access by pointer
			// (in C++ terms, since in JS all is allocated dynamically).
			static getInstance2 (name, ...args)
			{
				return this.getInstance(wasm_wrapper.Addr2(name)[0], ...args);
			}

			static getOriginalStructOffsets (name)
			{
				const orignial_struct_members = Object.keys(this.original_struct_descriptor);

				const offsets =
					wasm_wrapper.Size
					(
						wasm_wrapper.exports_demangled[name],

						orignial_struct_members.length,
					)
						.reduce((acc, offset, i) => ((acc[orignial_struct_members[i]] = offset), acc), {});

				return offsets;
			}



			constructor (input)
			{
				// // input is addres
				// if (typeof input === 'number')
				// {
				// 	this.addr = input;

				// 	this.original_struct = this.getOriginalStruct();
				// }
				// // input is base object
				// else
				// {
				// 	Object.assign(this, input);
				// }

				// input is addres
				if (typeof input === 'number')
				{
					this.addr = input;

					this.original_struct = this.getOriginalStruct();
				}
				// input is global name
				else if (typeof input === 'string')
				{
					[ this.addr ] = wasm_wrapper.Addr2(input);

					this.original_struct = this.getOriginalStruct();
				}
				// input is base object
				else
				{
					Object.assign(this, input);
				}
			}

			getMemberAddr (name)
			{
				const offset = this.constructor.original_struct_offsets[name];

				return (this.addr + offset);
			}

			getOriginalStruct ()
			{
				const original_struct = {};

				for (const member_name in this.constructor.original_struct_descriptor)
				{
					let type = this.constructor.original_struct_descriptor[member_name];

					if (Array.isArray(type))
					{
						let size = 0;

						[ type, size ] = type;

						original_struct[member_name] = wasm_wrapper[type](this.getMemberAddr(member_name), size);
					}
					else
					{
						original_struct[member_name] = wasm_wrapper[type](this.getMemberAddr(member_name));
					}
				}

				return original_struct;
			}

			getBitMask (parameter, values)
			{
				const result =
					this.original_struct[parameter]
						.reduce((prev, curr) => (prev | values[curr]), 0);

				return result;
			}

			updateStdVectorData (member_name, _type, _data)
			{
				const member_addr = this.getMemberAddr(member_name);

				wasm_wrapper.updateStdVectorData(member_addr, _type, _data);

				// Need to reassign original_struct member
				// since std::vector::resize() returns different addres of new data.
				const type = this.constructor.original_struct_descriptor[member_name];

				this.original_struct[member_name] = wasm_wrapper[type](member_addr);
			}
		}



		class RendererBase extends Base
		{
			static original_struct_descriptor =
				{
					width: 'Size',
					height: 'Size',
				};

			static original_struct_offsets =
				this.getOriginalStructOffsets('RDTY::WRAPPERS::renderer_offsets');



			constructor (addr)
			{
				super(addr);



				this.width = this.original_struct.width[0];
				this.height = this.original_struct.height[0];
			}

			appendFpsCounter ()
			{
				this.time = Date.now();

				this.fps_dom_element = document.createElement('div');

				window.Object.assign
				(
					this.fps_dom_element.style,

					{
						position: 'fixed',
						left: `${ this.canvas.offsetLeft }px`,
						top: `${ this.canvas.offsetTop }px`,
						color: 'black',
						backgroundColor: 'white',
					},
				);

				this.canvas.parentNode.appendChild(this.fps_dom_element);

				this.fps_counter = 0;
			}

			updateFpsCounter ()
			{
				if (Math.floor((Date.now() - this.time) * 0.001))
				{
					this.fps_dom_element.innerHTML = this.fps_counter;

					this.fps_counter = 0;

					this.time = Date.now();
				}

				++this.fps_counter;
			}
		}

		this.RendererBase = RendererBase;



		class UniformBase extends Base
		{
			static original_struct_descriptor =
				{
					object_addr: 'Addr',
					name: 'StdString',
					// TODO: rename to offset
					block_index: 'Size',
					size: 'Size',
				};

			static original_struct_offsets =
				this.getOriginalStructOffsets('RDTY::WRAPPERS::uniform_offsets');



			constructor (addr)
			{
				super(addr);



				this.name = WasmWrapper.convertUint8ArrayToDomString(this.original_struct.name);

				this._data = wasm_wrapper.Uint8(this.original_struct.object_addr[0], this.original_struct.size[0]);
			}
		}

		this.UniformBase = UniformBase;



		class UniformBlockBase extends Base
		{
			static original_struct_descriptor =
				{
					type: 'Size',
					binding: 'Size',
					name: 'StdString',
					visibility: 'StdVectorSize',
					uniforms: 'StdVectorAddr',
				};

			static original_struct_offsets =
				this.getOriginalStructOffsets('RDTY::WRAPPERS::uniform_block_offsets');



			constructor (addr)
			{
				super(addr);



				this.name = WasmWrapper.convertUint8ArrayToDomString(this.original_struct.name);



				this.uniforms_seq = null;
				this.uniforms_dict = {};

				this.buffer = null;

				this.buffer_length = 0;
			}

			getUniforms (renderer)
			{
				this.uniforms_seq =
					// TypedArray::map returns TypedArray, but need Array.
					Array.from(this.original_struct.uniforms).map
					(
						(uniform_addr) =>
						{
							const uniform = renderer.Uniform.getInstance(uniform_addr);

							this.buffer_length += uniform._data.length;

							this.uniforms_dict[uniform.name] = uniform;

							return uniform;
						},
					);
			}
		}

		this.UniformBlockBase = UniformBlockBase;



		class StorageBlockBase extends Base
		{
			static original_struct_descriptor =
				{
					type: 'Size',
					binding: 'Size',
					name: 'StdString',
					_data: 'Addr',
					size: 'Size',
				};

			static original_struct_offsets =
				this.getOriginalStructOffsets('RDTY::WRAPPERS::storage_block_offsets');



			constructor (addr)
			{
				super(addr);



				this.name = WasmWrapper.convertUint8ArrayToDomString(this.original_struct.name);

				this._data = wasm_wrapper.Uint8(this.original_struct._data, this.original_struct.size[0]);



				this.buffer = null;
			}
		}

		this.StorageBlockBase = StorageBlockBase;



		class DescriptorSetBase extends Base
		{
			static original_struct_descriptor =
				{
					bindings: 'StdVectorAddr',
				};

			static original_struct_offsets =
				this.getOriginalStructOffsets('RDTY::WRAPPERS::descriptor_set_offsets');
		}

		this.DescriptorSetBase = DescriptorSetBase;



		class MaterialBase extends Base
		{
			static original_struct_descriptor =
				{
					topology: 'Size',
					front_face: 'Size',
					blend_enabled: 'Size',
					blend_color_op: 'Size',
					blend_color_factor_src: 'Size',
					blend_color_factor_dst: 'Size',
					blend_alpha_op: 'Size',
					blend_alpha_factor_src: 'Size',
					blend_alpha_factor_dst: 'Size',
					code_vertex_glsl: 'StdString',
					code_vertex_glsl100es: 'StdString',
					code_vertex_glsl300es: 'StdString',
					code_vertex_wgsl: 'StdString',
					code_vertex_spirv: 'StdVectorUint32',
					code_fragment_glsl: 'StdString',
					code_fragment_glsl100es: 'StdString',
					code_fragment_glsl300es: 'StdString',
					code_fragment_wgsl: 'StdString',
					code_fragment_spirv: 'StdVectorUint32',
					// code_compute_glsl: 'StdString',
					uniforms: 'StdVectorAddr',
					uniform_blocks: 'StdVectorAddr',
					descriptor_sets: 'StdVectorAddr',
				};

			static original_struct_offsets =
				this.getOriginalStructOffsets('RDTY::WRAPPERS::material_offsets');

			static used_instance = null;



			constructor (addr)
			{
				super(addr);



				this.topology = this.constructor.TOPOLOGY[this.original_struct.topology[0]];

				this.front_face = this.constructor.FRONT_FACE[this.original_struct.front_face[0]];

				this.blend_enabled = this.constructor.BLEND_ENABLED[this.original_struct.blend_enabled[0]];

				this.blend_color_op =
					this.constructor.BLEND_OP[this.original_struct.blend_color_op[0]];

				this.blend_color_factor_src =
					this.constructor.BLEND_FACTOR[this.original_struct.blend_color_factor_src[0]];

				this.blend_color_factor_dst =
					this.constructor.BLEND_FACTOR[this.original_struct.blend_color_factor_dst[0]];

				this.blend_alpha_op =
					this.constructor.BLEND_OP[this.original_struct.blend_alpha_op[0]];

				this.blend_alpha_factor_src =
					this.constructor.BLEND_FACTOR[this.original_struct.blend_alpha_factor_src[0]];

				this.blend_alpha_factor_dst =
					this.constructor.BLEND_FACTOR[this.original_struct.blend_alpha_factor_dst[0]];

				// this.uniforms
				// this.uniform_blocks
			}
		}

		this.MaterialBase = MaterialBase;



		class ObjectBase extends Base
		{
			static original_struct_descriptor =
				{
					scene_vertex_data_offset: 'Size',
					scene_vertex_data_length: 'Size',
					position_data: 'StdVectorFloat',
					normal_data: 'StdVectorFloat',
					scene_index_data_offset: 'Size',
					scene_index_data_length: 'Size',
					index_data: 'StdVectorUint32',
					bounding_box_min: [ 'Float', 3 ],
					bounding_box_max: [ 'Float', 3 ],
				};

			static original_struct_offsets =
				this.getOriginalStructOffsets('RDTY::WRAPPERS::object_offsets');
		}

		this.ObjectBase = ObjectBase;



		class SceneBase extends Base
		{
			static original_struct_descriptor =
				{
					position_data: 'StdVectorFloat',
					normal_data: 'StdVectorFloat',
					index_data: 'StdVectorUint32',
					objects: 'StdVectorAddr',
					boxes: [ 'Uint32', 1024 * 1024 * 8 ],
					triangles: [ 'Uint32', 1024 * 1024 ],
				};

			static original_struct_offsets =
				this.getOriginalStructOffsets('RDTY::WRAPPERS::scene_offsets');
		}

		this.SceneBase = SceneBase;



		this.WebGL = getWebgl(this);
		this.WebGPU = getWebgpu(this);
	}
}
