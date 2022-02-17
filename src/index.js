import getWebgl from './webgl';
import getWebgpu from './webgpu';



export default class Renderers
{
	constructor (wasm_wrapper)
	{
		this.wasm_wrapper = wasm_wrapper;

		const WasmWrapper = this.wasm_wrapper.constructor;



		class Base
		{
			static instances = null;

			static getInstance (addr, ...args)
			{
				// if (!this.instances)
				// {
				// 	this.instances = {};
				// }

				// if (!this.instances[addr])
				// {
				// 	Object.defineProperty
				// 	(
				// 		this.instances,

				// 		addr,

				// 		{ value: new this(addr, ...args) },
				// 	);
				// }

				// return this.instances[addr];

				return new this(addr, ...args);
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
				switch (typeof addr)
				{
				case 'number':
				{
					const original_struct = {};

					let member_index = 0;

					for (const member_name in this.original_struct_descriptor)
					{
						// if (!this.original_struct_offsets)
						// {
						// 	this.original_struct_offsets =
						// 		wasm_wrapper.SizeTv
						// 		(
						// 			wasm_wrapper.exports_demangled[this.original_struct_offsets_name],
						// 			Object.keys(this.original_struct_descriptor).length,
						// 		);
						// }

						const type = this.original_struct_descriptor[member_name];

						original_struct[member_name] =
							wasm_wrapper[type](addr + this.original_struct_offsets[member_index]);

						++member_index;
					}

					return original_struct;
				}

				case 'object':
				{
					return addr;
				}

				default:
				{
					throw new Error('RDTY: Invalid argument.');
				}
				}
			}



			constructor (addr)
			{
				this.addr = addr;

				this.original_struct = this.constructor.getOriginalStruct(this.addr);
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



				// this.object_addr = this.original_struct.object_addr;

				this.name = WasmWrapper.convertUint8ArrayToDomString(this.original_struct.name);

				// uniform block index
				// this.block_index = this.original_struct.block_index;

				// this.size = this.original_struct.size;

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
				};

			static original_struct_offsets =
				this.getOriginalStructOffsets('RDTY::WRAPPERS::uniform_block_offsets');



			constructor (addr)
			{
				super(addr);



				// this.binding = this.original_struct.binding;

				// this.type = this.original_struct.type;

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



				// this.binding = this.original_struct.binding;

				// this.type = this.original_struct.type;

				this.name = WasmWrapper.convertUint8ArrayToDomString(this.original_struct.name);

				this._data = wasm_wrapper.Charv2(this.original_struct._data, this.original_struct.size);



				this.buffer = null;

				// this.buffer_length = 0;
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
					glsl100es_code_vertex: 'StdString',
					glsl100es_code_fragment: 'StdString',
					glsl300es_code_vertex: 'StdString',
					glsl300es_code_fragment: 'StdString',
					glsl4_code_vertex: 'StdString',
					glsl4_code_fragment: 'StdString',
					glsl_vulkan_code_vertex: 'StdString',
					glsl_vulkan_code_fragment: 'StdString',
					// glsl_vulkan_code_compute: 'StdString',
					wgsl_code_vertex: 'StdString',
					wgsl_code_fragment: 'StdString',
					spirv_code_vertex: 'StdVectorUint32',
					spirv_code_fragment: 'StdVectorUint32',
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
					scene_vertex_data_offset: 'SizeT',
					scene_vertex_data_length: 'SizeT',
					vertex_data: 'StdVectorFloat',
					scene_index_data_offset: 'SizeT',
					scene_index_data_length: 'SizeT',
					index_data: 'StdVectorUint32',
				};

			static original_struct_offsets =
				this.getOriginalStructOffsets('RDTY::WRAPPERS::object_offsets');



			updateVertexData (_data)
			{
				// TODO: cache this
				const offset =
					this.constructor.original_struct_offsets
						[Object.keys(this.constructor.original_struct_descriptor).indexOf('vertex_data')];

				wasm_wrapper.exports.RDTY_WASM_WRAPPER_StdVector_resize(this.addr + offset, _data.length);
				wasm_wrapper.StdVectorFloat(this.addr + offset).set(_data);
			}

			updateIndexData (_data)
			{
				const offset =
					this.constructor.original_struct_offsets
						[Object.keys(this.constructor.original_struct_descriptor).indexOf('index_data')];

				wasm_wrapper.exports.RDTY_WASM_WRAPPER_StdVector_resize(this.addr + offset, _data.length);
				wasm_wrapper.StdVectorUint32(this.addr + offset).set(_data);
			}
		}

		this.ObjectBase = ObjectBase;



		class SceneBase extends Base
		{
			static original_struct_descriptor =
				{
					vertex_data: 'StdVectorFloat',
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
