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

						{ value: new this(addr, ...args) },
					);
				}

				return this.instances[addr];
			}

			static getOriginalStruct (addr)
			{
				const original_struct = {};

				let member_index = 0;

				for (const member_name in this.original_struct_descriptor)
				{
					const type = this.original_struct_descriptor[member_name];

					original_struct[member_name] =
						wasm_wrapper[type](addr + this.original_struct_offsets[member_index]);

					++member_index;
				}

				return original_struct;
			}



			constructor (addr)
			{
				this.addr = addr;
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
				wasm_wrapper.SizeTv
				(
					wasm_wrapper.exports_demangled['RDTY::WRAPPERS::renderer_offsets'],
					Object.keys(this.original_struct_descriptor).length,
				);



			constructor (addr)
			{
				super(addr);



				this.original_struct = RendererBase.getOriginalStruct(this.addr);

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
				wasm_wrapper.SizeTv
				(
					wasm_wrapper.exports_demangled['RDTY::WRAPPERS::uniform_offsets'],
					Object.keys(this.original_struct_descriptor).length,
				);



			constructor (addr)
			{
				super(addr);



				this.original_struct = UniformBase.getOriginalStruct(this.addr);

				this.object_addr = this.original_struct.object_addr;

				this.name = WasmWrapper.uint8Array2DomString(this.original_struct.name);

				// uniform block index
				this.block_index = this.original_struct.block_index;

				this.size = this.original_struct.size;

				this._data = wasm_wrapper.Charv2(this.object_addr, this.size);
			}
		}

		this.UniformBase = UniformBase;



		class UniformBlockBase extends Base
		{
			static original_struct_descriptor =
				{
					binding: 'SizeT',
					type: 'SizeT',
					name: 'StdString',
					uniforms: 'StdVectorAddr',
				};

			static original_struct_offsets =
				wasm_wrapper.SizeTv
				(
					wasm_wrapper.exports_demangled['RDTY::WRAPPERS::uniform_block_offsets'],
					Object.keys(this.original_struct_descriptor).length,
				);



			constructor (addr)
			{
				super(addr);



				this.original_struct = UniformBlockBase.getOriginalStruct(this.addr);

				this.binding = this.original_struct.binding;

				this.type = this.original_struct.type;

				this.name = WasmWrapper.uint8Array2DomString(this.original_struct.name);



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



		class DescriptorSetBase extends Base
		{
			static original_struct_descriptor =
				{
					bindings: 'StdVectorAddr',
				};

			static original_struct_offsets =
				wasm_wrapper.SizeTv
				(
					wasm_wrapper.exports_demangled['RDTY::WRAPPERS::descriptor_set_offsets'],
					Object.keys(this.original_struct_descriptor).length,
				);



			constructor (addr)
			{
				super(addr);



				this.original_struct = DescriptorSetBase.getOriginalStruct(this.addr);

				// this.uniform_blocks
			}
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
				wasm_wrapper.SizeTv
				(
					wasm_wrapper.exports_demangled['RDTY::WRAPPERS::material_offsets'],
					Object.keys(this.original_struct_descriptor).length,
				);

			static used_instance = null;



			constructor (addr)
			{
				super(addr);



				this.original_struct = MaterialBase.getOriginalStruct(this.addr);



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
			constructor (addr)
			{
				super(addr);



				this.scene_vertex_data_offset = wasm_wrapper.SizeT(addr + (wasm_wrapper.PTR_SIZE * 2));
				this.scene_vertex_data_length = wasm_wrapper.SizeT(addr + (wasm_wrapper.PTR_SIZE * 3));
				this.vertex_data = wasm_wrapper.StdVectorFloat(addr + (wasm_wrapper.PTR_SIZE * 4));
			}
		}

		this.ObjectBase = ObjectBase;



		class SceneBase extends Base
		{
			constructor (addr)
			{
				super(addr);



				this.vertex_data = wasm_wrapper.StdVectorFloat(addr + (wasm_wrapper.PTR_SIZE * 2));
			}

			addObject (object_addr)
			{
				wasm_wrapper.exports_demangled['RDTY::WRAPPERS::Scene::addObject()'](this.addr, object_addr);
			}
		}

		this.SceneBase = SceneBase;



		this.WebGL = getWebgl(this);
		this.WebGPU = getWebgpu(this);
	}
}
