import glslang from '@webgpu/glslang/dist/web-devel-onefile/glslang.js';



export default class WebGPU
{
	constructor (wasm)
	{
		const WasmWrapper = wasm.constructor;



		class Renderer extends wasm.Renderer
		{
			// dpr
			constructor (addr_renderer, options)
			{
				super(addr_renderer);

				this.exists = true;



				/* eslint-disable-next-line consistent-this */
				const renderer = this;



				this.canvas = options.canvas || document.createElement('canvas');

				this.canvas.width = this.original_struct.width;
				this.canvas.height = this.original_struct.height;

				this.canvas.style.width = `${ this.original_struct.width }px`;
				this.canvas.style.height = `${ this.original_struct.height }px`;

				this._context = this.canvas.getContext('webgpu');

				if (!this._context || !window.navigator.gpu)
				{
					this.exists = false;

					return undefined;
				}



				this.loop_function = null;



				this.adapter = null;
				this.device = null;
				this.render_format = options.render_format;

				this.render_pass_encoder = null;



				this.glslang = null;



				class Uniform extends wasm.Uniform
				{}

				this.Uniform = Uniform;



				class UniformBlock extends wasm.UniformBlock
				{
					constructor (addr)
					{
						super(addr);



						this.getUniforms(renderer);

						this.buffer =
							renderer.device.createBuffer
							({
								size: this.buffer_length,

								usage:
								(
									window.GPUBufferUsage.COPY_DST |
									window.GPUBufferUsage.UNIFORM
									// window.GPUBufferUsage.COPY_SRC |
									// window.GPUBufferUsage.MAP_WRITE
								),
							});

						// this.buffer.mapAsync(window.GPUMapMode.WRITE);

						this.entry =
						{
							binding: this.binding,

							resource:
							{
								buffer: this.buffer,
								offset: 0,
								size: this.buffer_length,
							},
						};

						// rename to layout
						this.entry_layout =
						{
							binding: this.binding,

							// !
							visibility: window.GPUShaderStage.VERTEX,

							buffer:
							{
								type: 'uniform',
								hasDynamicOffset: false,
								minBindingSize: 0,
							},
						};



						this.use();
					}

					use ()
					{
						for
						(
							let uniform_index = 0;
							uniform_index < this.uniforms_seq.length;
							++uniform_index
						)
						{
							const uniform = this.uniforms_seq[uniform_index];

							// This is analog for vkCmdUpdateBuffer.
							// So it is recommended for updating small amounts of data.
							// May be keep buffer mapped and apdate data with TypedArray.set?
							renderer.device.queue.writeBuffer
							(this.buffer, uniform.block_index, uniform._data, 0, uniform._data.length);
						}
					}
				}

				this.UniformBlock = UniformBlock;



				// Descriptor set is a bind group in vulkan terms.
				class DescriptorSet extends wasm.DescriptorSet
				{
					static BINDING_TYPE =
						{
							UNIFORM_BUFFER: 0,
						};



					constructor (addr)
					{
						super(addr);



						this.binding_seq = [];
						this.binding_dict = {};

						const bind_group_layout_descriptor =
						{
							entryCount: 0,
							entries: [],
						};

						this.bind_group_descriptor =
						{
							layout: null,

							entryCount: 0,
							entries: [],
						};

						this.original_struct.bindings.forEach
						(
							(binding_addr) =>
							{
								const binding = UniformBlock.getInstance(binding_addr);

								bind_group_layout_descriptor.entries.push(binding.entry_layout);

								++bind_group_layout_descriptor.entryCount;

								this.bind_group_descriptor.entries.push(binding.entry);

								++this.bind_group_descriptor.entryCount;

								this.binding_seq.push(binding);
								this.binding_dict[binding.name] = binding;
							},
						);



						const bind_group_layout = renderer.device.createBindGroupLayout(bind_group_layout_descriptor);

						this.bind_group_descriptor.layout = bind_group_layout;

						this.bind_group =
							renderer.device.createBindGroup(this.bind_group_descriptor);



						// use();
					}

					use (bind_group_index)
					{
						renderer.render_pass_encoder.setBindGroup(bind_group_index, this.bind_group, []);

						// use for loop
						this.binding_seq.forEach((binding) => binding.use());
					}
				}

				this.DescriptorSet = DescriptorSet;



				class Material extends wasm.Material
				{
					static TOPOLOGY =
						[
							'triangle-list',
							'point-list',
							'line-list',
							'triangle-strip',
							'line-strip',
						];

					static FRONT_FACE =
						[
							'ccw',
							'cw',
						];

					static ShaderUsage =
						{
							SPIRV: 0,
							GLSL_VULKAN: 1,
							WGSL: 2,
						};



					constructor (addr, shader_usage = Material.ShaderUsage.WGSL)
					{
						super(addr);



						const pipeline_configuration =
						{
							layout: null,

							vertex:
							{
								module: null,
								entryPoint: 'main',
								// record<USVString, GPUPipelineConstantValue> constants,

								bufferCount: 1,

								buffers:
								[
									{
										arrayStride: 12,
										stepMode: 'vertex',

										attributeCount: 1,

										attributes:
										[
											{
												format: 'float32x3',
												offset: 0,
												shaderLocation: 0,
											},
										],
									},
								],
							},

							primitive:
							{
								frontFace: this.front_face,
								topology: this.topology,
							},

							fragment:
							{
								module: null,
								entryPoint: 'main',

								targetCount: 1,

								targets:
								[
									{
										format: renderer.render_format,
									},
								],
							},
						};



						switch (shader_usage)
						{
						case Material.ShaderUsage.SPIRV:
						{
							{
								const code = new Uint32Array(this.original_struct.spirv_code_vertex);

								const shader_module = renderer.device.createShaderModule({ code });

								pipeline_configuration.vertex.module = shader_module;
							}

							{
								const code = new Uint32Array(this.original_struct.spirv_code_fragment);

								const shader_module = renderer.device.createShaderModule({ code });

								pipeline_configuration.fragment.module = shader_module;
							}

							break;
						}

						case Material.ShaderUsage.GLSL_VULKAN:
						{
							{
								const code_glsl =
									WasmWrapper.uint8Array2DomString(this.original_struct.glsl_vulkan_code_vertex);

								const code = renderer.glslang.compileGLSL(code_glsl, 'vertex');

								const shader_module = renderer.device.createShaderModule({ code });

								pipeline_configuration.vertex.module = shader_module;
							}

							{
								const code_glsl =
									WasmWrapper.uint8Array2DomString(this.original_struct.glsl_vulkan_code_fragment);

								const code = renderer.glslang.compileGLSL(code_glsl, 'fragment');

								const shader_module = renderer.device.createShaderModule({ code });

								pipeline_configuration.fragment.module = shader_module;
							}

							break;
						}

						case Material.ShaderUsage.WGSL:
						{
							{
								const code = WasmWrapper.uint8Array2DomString(this.original_struct.wgsl_code_vertex);

								const shader_module = renderer.device.createShaderModule({ code });

								pipeline_configuration.vertex.module = shader_module;
							}

							{
								const code = WasmWrapper.uint8Array2DomString(this.original_struct.wgsl_code_fragment);

								const shader_module = renderer.device.createShaderModule({ code });

								pipeline_configuration.fragment.module = shader_module;
							}

							break;
						}

						default:
						}



						this.descriptor_sets = [];

						const pipeline_layout_descriptor =
						{
							bindGroupLayouts: [],
						};

						this.original_struct.descriptor_sets.forEach
						(
							(descriptor_set_addr) =>
							{
								const descriptor_set = DescriptorSet.getInstance(descriptor_set_addr);

								pipeline_layout_descriptor.bindGroupLayouts.push
								(descriptor_set.bind_group_descriptor.layout);

								this.descriptor_sets.push(descriptor_set);
							},
						);

						pipeline_configuration.layout =
							renderer.device.createPipelineLayout(pipeline_layout_descriptor);



						this.pipeline = renderer.device.createRenderPipeline(pipeline_configuration);
					}

					use ()
					{
						Material.used_instance = this;

						// Use dedicated_descriptor_set?

						renderer.render_pass_encoder.setPipeline(this.pipeline);
					}
				}

				this.Material = Material;



				class _Object extends wasm.Object
				{
					draw ()
					{
						renderer.render_pass_encoder.draw
						(this.scene_vertex_data_length, 1, this.scene_vertex_data_offset, 0);
					}
				}

				this.Object = _Object;



				class Scene extends wasm.Scene
				{}

				this.Scene = Scene;
			}

			async init ()
			{
				this.glslang = await glslang();

				this.adapter = await navigator.gpu.requestAdapter();

				this.device = await this.adapter.requestDevice();

				if (!this.render_format)
				{
					this.render_format = this._context.getPreferredFormat(this.adapter);
				}

				this._context.configure
				({
					device: this.device,
					format: this.render_format,
					usage: window.GPUTextureUsage.RENDER_ATTACHMENT,
					// GPUPredefinedColorSpace colorSpace = "srgb";
					// GPUCanvasCompositingAlphaMode compositingAlphaMode = "opaque";

					size:
					{
						width: this.original_struct.width,
						height: this.original_struct.height,
						depthOrArrayLayers: 1,
					},
					// size: [ 800, 600 ],
				});
			}

			startLoop ()
			{
				this.loop_function_wrapper = () =>
				{
					this.loop_function();

					this.animation_frame = requestAnimationFrame(this.loop_function_wrapper);
				};

				this.animation_frame = requestAnimationFrame(this.loop_function_wrapper);
			}

			endLoop ()
			{
				cancelAnimationFrame(this.animation_frame);
			}
		}

		this.Renderer = Renderer;
	}
}
