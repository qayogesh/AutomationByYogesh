package com.yogesh.automation.dataStructure;

import java.util.Arrays;
import java.util.HashSet;

import org.apache.commons.lang3.ArrayUtils;

public class ArrayUnionElements {

	public static void main(String[] args) {
		ArrayUnionElements obj = new ArrayUnionElements();
		int[] arr1 = { 2, 3, 4, 5, 6, 7 };
		int[] arr2 = { 5, 6, 7, 8, 9, 2, 2 };
		obj.unionArrayElements(arr1, arr2);
	}

	public void unionArrayElements(int[] arr1, int[] arr2) {
		int len1 = arr1.length;
		int len2 = arr2.length;

		int[] result = ArrayUtils.addAll(arr1, arr2);
		System.out.println(Arrays.toString(result));

		HashSet set = new HashSet<>();
		int len3 = result.length;
		for (int i = 0; i < len3; i++) {
			if (set.add(result[i]) == true) {
				set.add(result[i]);
			}
		}
		System.out.println("Union is #" + set);
	}

}

/** output Union is #[2, 3, 4, 5, 6, 7, 8, 9] */