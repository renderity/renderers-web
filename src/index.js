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

			static getInstance (addr, ...args)
			{
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

			static getOriginalStructOffsets (name)
			{
				const offsets =
					wasm_wrapper.SizeTv
					(
						wasm_wrapper.exports_demangled[name],
						Object.keys(this.original_struct_descriptor).length,
					);

				return offsets;
			}

			static getOriginalStruct (addr)
			{
				const original_struct = {};

				let member_index = 0;

				for (const member_name in this.original_struct_descriptor)
				{
					let type = this.original_struct_descriptor[member_name];

					if (Array.isArray(type))
					{
						let size = 0;

						[ type, size ] = type;

						original_struct[member_name] =
							wasm_wrapper[type](addr + this.original_struct_offsets[member_index], size);
					}
					else
					{
						original_struct[member_name] =
							wasm_wrapper[type](addr + this.original_struct_offsets[member_index]);
					}

					++member_index;
				}

				return original_struct;
			}



			constructor (input)
			{
				// input is addres
				if (typeof input === 'number')
				{
					this.addr = input;

					this.original_struct = this.constructor.getOriginalStruct(this.addr);
				}
				// input is base object
				else
				{
					Object.assign(this, input);
				}
			}

			getBitMask (parameter, values)
			{
				const result =
					this.original_struct[parameter]
						.reduce((prev, curr) => (prev | values[curr]), 0);

				return result;
			}

			getMemberAddr (name)
			{
				const offset =
					this.constructor.original_struct_offsets
						[Object.keys(this.constructor.original_struct_descriptor).indexOf(name)];

				return (this.addr + offset);
			}

			updateStdVectorData (member_name, _data)
			{
				wasm_wrapper.updateStdVectorData(this.getMemberAddr(member_name), _data);

				const type = this.constructor.original_struct_descriptor[member_name];

				this.original_struct[member_name] =
					wasm_wrapper[type]
					(this.addr + this.constructor.original_struct_offsets[Object.keys(this.constructor.original_struct_descriptor).indexOf(member_name)]);
			}
		}



		class RendererBase extends Base
		{
			static original_struct_descriptor =
				{
					width: 'SizeT',
					height: 'SizeT',
				};

			static original_struct_offsets =
				this.getOriginalStructOffsets('RDTY::WRAPPERS::renderer_offsets');



			constructor (addr)
			{
				super(addr);



				this.width = this.original_struct.width;
				this.height = this.original_struct.height;
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
					block_index: 'SizeT',
					size: 'SizeT',
				};

			static original_struct_offsets =
				this.getOriginalStructOffsets('RDTY::WRAPPERS::uniform_offsets');



			constructor (addr)
			{
				super(addr);



				this.name = WasmWrapper.convertUint8ArrayToDomString(this.original_struct.name);

				this._data = wasm_wrapper.Charv2(this.original_struct.object_addr, this.original_struct.size);
			}
		}

		this.UniformBase = UniformBase;



		class UniformBlockBase extends Base
		{
			static original_struct_descriptor =
				{
					type: 'SizeT',
					binding: 'SizeT',
					name: 'StdString',
					uniforms: 'StdVectorAddr',
					visibility: 'StdVectorSizeT',
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
					type: 'SizeT',
					binding: 'SizeT',
					name: 'StdString',
					_data: 'Addr',
					size: 'SizeT',
				};

			static original_struct_offsets =
				this.getOriginalStructOffsets('RDTY::WRAPPERS::storage_block_offsets');



			constructor (addr)
			{
				super(addr);



				this.name = WasmWrapper.convertUint8ArrayToDomString(this.original_struct.name);

				this._data = wasm_wrapper.Charv2(this.original_struct._data, this.original_struct.size);



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
					topology: 'SizeT',
					front_face: 'SizeT',
					blend_enabled: 'SizeT',
					blend_color_op: 'SizeT',
					blend_color_factor_src: 'SizeT',
					blend_color_factor_dst: 'SizeT',
					blend_alpha_op: 'SizeT',
					blend_alpha_factor_src: 'SizeT',
					blend_alpha_factor_dst: 'SizeT',
					code_glsl100es_vertex: 'StdString',
					code_glsl100es_fragment: 'StdString',
					code_glsl300es_vertex: 'StdString',
					code_glsl300es_fragment: 'StdString',
					// code_glsl_vertex: 'StdString',
					// code_glsl_fragment: 'StdString',
					code_glsl_vertex: 'StdString',
					code_glsl_fragment: 'StdString',
					// code_glsl_compute: 'StdString',
					code_wgsl_vertex: 'StdString',
					code_wgsl_fragment: 'StdString',
					code_spirv_vertex: 'StdVectorUint32',
					code_spirv_fragment: 'StdVectorUint32',
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



				this.topology = this.constructor.TOPOLOGY[this.original_struct.topology];

				this.front_face = this.constructor.FRONT_FACE[this.original_struct.front_face];

				this.blend_enabled = this.constructor.BLEND_ENABLED[this.original_struct.blend_enabled];

				this.blend_color_op =
					this.constructor.BLEND_OP[this.original_struct.blend_color_op];

				this.blend_color_factor_src =
					this.constructor.BLEND_FACTOR[this.original_struct.blend_color_factor_src];

				this.blend_color_factor_dst =
					this.constructor.BLEND_FACTOR[this.original_struct.blend_color_factor_dst];

				this.blend_alpha_op =
					this.constructor.BLEND_OP[this.original_struct.blend_alpha_op];

				this.blend_alpha_factor_src =
					this.constructor.BLEND_FACTOR[this.original_struct.blend_alpha_factor_src];

				this.blend_alpha_factor_dst =
					this.constructor.BLEND_FACTOR[this.original_struct.blend_alpha_factor_dst];

				// this.uniforms
				// this.uniform_blocks
			}
		}

		this.MaterialBase = MaterialBase;



		class ObjectBase extends Base
		{
			static original_struct_descriptor =
				{
					scene_position_data_offset: 'SizeT',
					scene_position_data_length: 'SizeT',
					position_data: 'StdVectorFloat',
					scene_index_data_offset: 'SizeT',
					scene_index_data_length: 'SizeT',
					index_data: 'StdVectorUint32',
					bounding_box_min: [ 'Floatv', 3 ],
					bounding_box_max: [ 'Floatv', 3 ],
				};

			static original_struct_offsets =
				this.getOriginalStructOffsets('RDTY::WRAPPERS::object_offsets');



			// updateData (name, _data)
			// {
			// 	// TODO: cache this
			// 	const addr = this.getMemberAddr(name);

			// 	wasm_wrapper.updateStdVectorData(addr, _data);
			// }

			// updateIndexData (_data)
			// {
			// 	const offset =
			// 		this.constructor.original_struct_offsets
			// 			[Object.keys(this.constructor.original_struct_descriptor).indexOf('index_data')];

			// 	wasm_wrapper.exports.RDTY_WASM_WRAPPER_StdVector_resize(this.addr + offset, _data.length);
			// 	wasm_wrapper.StdVectorUint32(this.addr + offset).set(_data);
			// }
		}

		this.ObjectBase = ObjectBase;



		class SceneBase extends Base
		{
			static original_struct_descriptor =
				{
					position_data: 'StdVectorFloat',
					index_data: 'StdVectorUint32',
				};

			static original_struct_offsets =
				this.getOriginalStructOffsets('RDTY::WRAPPERS::scene_offsets');
		}

		this.SceneBase = SceneBase;



		this.WebGL = getWebgl(this);
		this.WebGPU = getWebgpu(this);
	}
}
